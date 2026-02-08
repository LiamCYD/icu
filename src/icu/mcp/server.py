"""FastMCP server exposing ICU scanning as tools for AI assistants."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

from icu.analyzer.models import Finding, ScanResult
from icu.analyzer.scanner import Scanner
from icu.reputation.database import ReputationDB

mcp = FastMCP(
    "icu",
    instructions=(
        "AI supply chain firewall — scan files for prompt"
        " injection, data exfiltration, and obfuscated payloads"
    ),
)

# Lazy-initialized globals
_scanner: Scanner | None = None
_db: ReputationDB | None = None


def _get_db() -> ReputationDB | None:
    """Get or create the reputation DB, returning None on failure."""
    global _db
    if _db is None:
        try:
            _db = ReputationDB()
        except Exception:
            pass
    return _db


def _get_scanner() -> Scanner:
    """Get or create the scanner (lazy init on first tool call)."""
    global _scanner
    if _scanner is None:
        _scanner = Scanner(db=_get_db())
    return _scanner


def _result_to_json(result: ScanResult) -> str:
    """Serialize a ScanResult to JSON string."""
    return json.dumps(result.to_dict(), indent=2)


def _results_summary(results: list[ScanResult]) -> dict[str, Any]:
    """Build a summary dict for a list of scan results."""
    summary: dict[str, int] = {}
    for r in results:
        summary[r.risk_level] = summary.get(r.risk_level, 0) + 1
    return {
        "total_files": len(results),
        "risk_counts": summary,
        "results": [r.to_dict() for r in results],
    }


@mcp.tool()
def scan_file(path: str, depth: str = "auto") -> str:
    """Scan a single file for prompt injection and obfuscated payloads.

    Args:
        path: Absolute or relative path to the file to scan.
        depth: Scan depth — "fast", "deep", or "auto" (default).
    """
    try:
        scanner = _get_scanner()
        result = scanner.scan_file(path, depth=depth)  # type: ignore[arg-type]
        return _result_to_json(result)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
def scan_directory(path: str, depth: str = "auto") -> str:
    """Scan all files in a directory recursively.

    Args:
        path: Absolute or relative path to the directory to scan.
        depth: Scan depth — "fast", "deep", or "auto" (default).
    """
    try:
        scanner = _get_scanner()
        results = scanner.scan_directory(path, depth=depth)  # type: ignore[arg-type]
        return json.dumps(_results_summary(results), indent=2)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
def check_content(content: str, filename: str = "untitled") -> str:
    """Scan inline text content for threats before writing it to disk.

    This is the primary tool for AI assistants to vet generated code or
    configuration before saving it. Pass the content you intend to write
    and an optional logical filename for context.

    Args:
        content: The text content to scan.
        filename: Logical filename for context (e.g. "setup.py").
    """
    try:
        scanner = _get_scanner()
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=Path(filename).suffix or ".txt",
            delete=True,
        ) as tmp:
            tmp.write(content)
            tmp.flush()
            result = scanner.scan_file(tmp.name)

        # Patch file_path to logical filename (ScanResult is frozen)
        patched = ScanResult(
            file_path=filename,
            risk_level=result.risk_level,
            findings=tuple(
                Finding(
                    rule_id=f.rule_id,
                    description=f.description,
                    severity=f.severity,
                    file_path=filename,
                    line_number=f.line_number,
                    matched_text=f.matched_text,
                    context=f.context,
                )
                for f in result.findings
            ),
            sha256=result.sha256,
            scan_time_ms=result.scan_time_ms,
        )
        return _result_to_json(patched)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
def lookup_hash(sha256: str) -> str:
    """Look up a file hash in the reputation database.

    Args:
        sha256: The SHA-256 hex digest to look up.
    """
    try:
        db = _get_db()
        if db is None:
            return json.dumps({"error": "Reputation database unavailable"})
        sig = db.lookup_hash(sha256)
        if sig is None:
            return json.dumps({"found": False, "sha256": sha256})
        return json.dumps({
            "found": True,
            "sha256": sig.sha256,
            "name": sig.name,
            "risk_level": sig.risk_level,
            "flagged": sig.flagged,
            "scan_count": sig.scan_count,
        })
    except Exception as exc:
        return json.dumps({"error": str(exc)})


def main() -> None:
    """Entry point for ``icu-mcp`` console script."""
    mcp.run()
