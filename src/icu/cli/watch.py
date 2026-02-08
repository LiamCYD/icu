"""``icu watch`` — real-time directory monitoring."""

from __future__ import annotations

import threading
from pathlib import Path

import click

from icu.analyzer.scanner import Scanner
from icu.config import load_config
from icu.reputation.database import ReputationDB
from icu.runtime.watcher import watch_directory
from icu.utils.formatting import (
    get_console,
    print_policy_result,
    print_scan_result,
)


@click.command()
@click.argument("target", type=click.Path(exists=True, file_okay=False))
@click.option(
    "--depth",
    type=click.Choice(["fast", "deep", "auto"]),
    default="auto",
    help="Scan depth: fast, deep, or auto.",
)
@click.option(
    "--policy",
    "policy_path",
    type=click.Path(exists=True),
    default=None,
    help="Policy YAML file to evaluate results against.",
)
@click.option(
    "--no-db",
    is_flag=True,
    default=False,
    help="Disable reputation database.",
)
@click.option(
    "--exclude",
    multiple=True,
    help="Glob pattern to exclude (repeatable).",
)
def watch(
    target: str,
    depth: str,
    policy_path: str | None,
    no_db: bool,
    exclude: tuple[str, ...],
) -> None:
    """Watch a directory and scan files as they change."""
    cfg = load_config()
    eff_depth = depth if depth != "auto" else cfg.depth
    eff_no_db = no_db or cfg.no_db
    eff_exclude = exclude + cfg.exclude

    console = get_console()
    target_dir = Path(target)

    db = None
    if not eff_no_db:
        try:
            db = ReputationDB()
        except Exception as exc:
            console.print(
                f"[dim]Warning: reputation DB unavailable: {exc}[/dim]"
            )

    scanner = Scanner(db=db, exclude=eff_exclude)

    policy_engine = None
    if policy_path is not None:
        from icu.policy.engine import PolicyEngine
        from icu.policy.loader import load_policy

        policy = load_policy(policy_path)
        policy_engine = PolicyEngine(policy)

    def on_result(result: object) -> None:
        from icu.analyzer.models import ScanResult

        assert isinstance(result, ScanResult)
        if not result.findings:
            return
        print_scan_result(result)
        if policy_engine is not None:
            pr = policy_engine.evaluate(result)
            print_policy_result(pr, file_path=result.file_path)

    stop_event = threading.Event()

    console.print(
        f"[bold]Watching[/bold] {target_dir.resolve()} "
        f"[dim](depth={eff_depth}, Ctrl+C to stop)[/dim]",
    )

    try:
        watch_directory(
            path=target_dir,
            scanner=scanner,
            depth=eff_depth,  # type: ignore[arg-type]
            on_result=on_result,
            stop_event=stop_event,
        )
    except KeyboardInterrupt:
        stop_event.set()
        console.print("\n[bold]Stopped.[/bold]")
    finally:
        if db is not None:
            db.close()
