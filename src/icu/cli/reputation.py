"""CLI commands for reputation database management."""

from __future__ import annotations

import json
import re
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import click

from icu.reputation.database import ReputationDB
from icu.reputation.models import ThreatSignature
from icu.utils.formatting import (
    format_signature,
    format_threat_signature_table,
    get_console,
)
from icu.utils.logging import get_logger

_log = get_logger("cli.reputation")

_SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")


@contextmanager
def _get_db(db_path: str | None) -> Iterator[ReputationDB]:
    path = Path(db_path) if db_path else None
    db = ReputationDB(db_path=path)
    try:
        yield db
    finally:
        db.close()


# ── Top-level: icu lookup ─────────────────────────────────────


@click.command()
@click.argument("target")
@click.option(
    "--format",
    "output_format",
    type=click.Choice(["table", "json"]),
    default="table",
    help="Output format.",
)
@click.option("--db-path", default=None, help="Path to reputation database.")
def lookup(target: str, output_format: str, db_path: str | None) -> None:
    """Look up a file or SHA256 hash in the reputation database."""
    console = get_console()

    # Auto-detect: SHA256 hash or file path
    if _SHA256_RE.match(target):
        sha256 = target
    else:
        target_path = Path(target)
        if not target_path.is_file():
            click.echo(f"Error: File not found: {target}", err=True)
            sys.exit(2)
        from icu.reputation.hasher import hash_file

        sha256 = hash_file(target_path)

    with _get_db(db_path) as db:
        sig = db.lookup_hash(sha256)
        history = db.get_scan_history(sha256)

    if output_format == "json":
        data: dict[str, Any] = {
            "sha256": sha256,
            "signature": None,
            "scan_history": history,
        }
        if sig is not None:
            data["signature"] = {
                "sha256": sig.sha256,
                "name": sig.name,
                "risk_level": sig.risk_level,
                "scan_count": sig.scan_count,
                "flagged": sig.flagged,
                "first_seen": (
                    sig.first_seen.isoformat() if sig.first_seen else None
                ),
                "last_seen": (
                    sig.last_seen.isoformat() if sig.last_seen else None
                ),
            }
        click.echo(json.dumps(data, indent=2))
        return

    if sig is None:
        click.echo(f"No signature found for {sha256[:16]}...")
    else:
        console.print(format_signature(sig))

    if history:
        click.echo(f"\nScan history ({len(history)} entries):")
        for entry in history:
            click.echo(
                f"  {entry['timestamp']}  "
                f"[{entry['scan_type']}]  "
                f"result={entry['result']}  "
                f"duration={entry['duration_ms']:.1f}ms"
            )
    else:
        click.echo("No scan history.")


# ── Group: icu reputation ─────────────────────────────────────


@click.group()
def reputation() -> None:
    """Manage threat signatures in the reputation database."""


@reputation.command("stats")
@click.option(
    "--format",
    "output_format",
    type=click.Choice(["table", "json"]),
    default="table",
    help="Output format.",
)
@click.option("--db-path", default=None, help="Path to reputation database.")
def stats(output_format: str, db_path: str | None) -> None:
    """Show reputation database statistics."""
    console = get_console()

    with _get_db(db_path) as db:
        data = db.get_stats()

    if output_format == "json":
        click.echo(json.dumps(data, indent=2))
        return

    from rich.table import Table

    table = Table(show_header=False, padding=(0, 1))
    table.add_column("Label", style="bold", width=22)
    table.add_column("Value")

    table.add_row("File hashes", str(data["file_hashes"]))
    table.add_row("  Clean", str(data["clean"]))
    table.add_row("  Flagged", str(data["flagged"]))

    risk_breakdown = data.get("risk_breakdown", {})
    if isinstance(risk_breakdown, dict):
        for level, count in sorted(risk_breakdown.items()):
            table.add_row(f"  Risk: {level}", str(count))

    table.add_row("Threat signatures", str(data["threat_signatures"]))
    threat_cats = data.get("threat_by_category", {})
    if isinstance(threat_cats, dict):
        for cat, count in sorted(threat_cats.items()):
            table.add_row(f"  Category: {cat}", str(count))

    table.add_row("Total scans", str(data["total_scans"]))

    console.print(table)


@reputation.command("list")
@click.option("--category", default=None, help="Filter by category.")
@click.option(
    "--format",
    "output_format",
    type=click.Choice(["table", "json"]),
    default="table",
    help="Output format.",
)
@click.option("--db-path", default=None, help="Path to reputation database.")
def list_sigs(
    category: str | None, output_format: str, db_path: str | None
) -> None:
    """List threat signatures."""
    console = get_console()

    with _get_db(db_path) as db:
        sigs = db.get_threat_signatures(category=category)

    if output_format == "json":
        data = [
            {
                "id": s.id,
                "name": s.name,
                "category": s.category,
                "pattern": s.pattern,
                "severity": s.severity,
                "description": s.description,
                "source": s.source,
            }
            for s in sigs
        ]
        click.echo(json.dumps(data, indent=2))
        return

    if not sigs:
        click.echo("No threat signatures found.")
        return

    console.print(format_threat_signature_table(sigs))
    click.echo(f"{len(sigs)} threat signature(s) found.")


@reputation.command("add")
@click.option("--name", required=True, help="Signature name.")
@click.option("--category", required=True, help="Threat category.")
@click.option("--pattern", required=True, help="Regex pattern.")
@click.option(
    "--severity",
    type=click.Choice(["info", "warning", "danger", "critical"]),
    default="warning",
    help="Severity level.",
)
@click.option("--description", default="", help="Description.")
@click.option("--db-path", default=None, help="Path to reputation database.")
def add_sig(
    name: str,
    category: str,
    pattern: str,
    severity: str,
    description: str,
    db_path: str | None,
) -> None:
    """Add a new threat signature."""
    # Validate regex
    try:
        re.compile(pattern, re.IGNORECASE)
    except re.error as exc:
        click.echo(f"Invalid regex pattern: {exc}", err=True)
        sys.exit(2)

    sig = ThreatSignature(
        name=name,
        category=category,
        pattern=pattern,
        severity=severity,
        description=description,
        source="local",
    )

    with _get_db(db_path) as db:
        sig_id = db.add_threat_signature(sig)

    click.echo(f"Added threat signature ID={sig_id}")


@reputation.command("remove")
@click.argument("sig_id", type=int)
@click.option("--db-path", default=None, help="Path to reputation database.")
def remove_sig(sig_id: int, db_path: str | None) -> None:
    """Remove a threat signature by ID."""
    with _get_db(db_path) as db:
        removed = db.remove_threat_signature(sig_id)

    if removed:
        click.echo(f"Removed threat signature ID={sig_id}")
    else:
        click.echo(f"No threat signature found with ID={sig_id}")
        sys.exit(1)


@reputation.command("import")
@click.argument("yaml_file", type=click.Path(exists=True))
@click.option("--db-path", default=None, help="Path to reputation database.")
def import_sigs(yaml_file: str, db_path: str | None) -> None:
    """Import threat signatures from a YAML file."""
    import yaml

    data = yaml.safe_load(Path(yaml_file).read_text(encoding="utf-8"))
    if not data or "signatures" not in data:
        click.echo("No signatures found in file.")
        return

    count = 0
    with _get_db(db_path) as db:
        for entry in data["signatures"]:
            # Validate regex
            try:
                re.compile(entry["pattern"], re.IGNORECASE)
            except re.error:
                click.echo(
                    f"Skipping invalid pattern: {entry.get('name', '?')}",
                    err=True,
                )
                continue

            sig = ThreatSignature(
                name=entry["name"],
                category=entry["category"],
                pattern=entry["pattern"],
                severity=entry.get("severity", "warning"),
                description=entry.get("description", ""),
                source=entry.get("source", "import"),
            )
            db.add_threat_signature(sig)
            count += 1

    click.echo(f"Imported {count} threat signature(s).")


@reputation.command("export")
@click.option(
    "--format",
    "output_format",
    type=click.Choice(["yaml", "json"]),
    default="yaml",
    help="Export format.",
)
@click.option("--db-path", default=None, help="Path to reputation database.")
def export_sigs(output_format: str, db_path: str | None) -> None:
    """Export all threat signatures."""
    with _get_db(db_path) as db:
        sigs = db.get_threat_signatures()

    entries = [
        {
            "name": s.name,
            "category": s.category,
            "pattern": s.pattern,
            "severity": s.severity,
            "description": s.description,
            "source": s.source,
        }
        for s in sigs
    ]

    if output_format == "json":
        click.echo(json.dumps({"signatures": entries}, indent=2))
    else:
        import yaml

        click.echo(
            yaml.dump({"signatures": entries}, default_flow_style=False)
        )
