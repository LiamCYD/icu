from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import TYPE_CHECKING

import click

from icu.analyzer.models import RISK_LEVEL_ORDER, ScanResult
from icu.analyzer.scanner import Scanner
from icu.utils.formatting import (
    get_console,
    print_policy_result,
    print_scan_result,
    print_scan_summary,
)

if TYPE_CHECKING:
    from icu.policy.models import PolicyResult


@click.command()
@click.argument("target", type=click.Path(exists=True))
@click.option(
    "--depth",
    type=click.Choice(["fast", "deep", "auto"]),
    default="auto",
    help="Scan depth: fast, deep, or auto (escalate if suspicious).",
)
@click.option(
    "--format",
    "output_format",
    type=click.Choice(["table", "json", "sarif"]),
    default="table",
    help="Output format.",
)
@click.option(
    "--no-db",
    is_flag=True,
    default=False,
    help="Disable reputation database.",
)
@click.option(
    "--max-size",
    type=int,
    default=None,
    help="Max file size in bytes (default: 1048576 = 1 MB).",
)
@click.option(
    "--exclude",
    multiple=True,
    help="Glob pattern to exclude (repeatable).",
)
@click.option(
    "--workers",
    type=int,
    default=None,
    help="Max worker threads for directory scanning.",
)
@click.option(
    "--policy",
    "policy_path",
    type=click.Path(exists=True),
    default=None,
    help="Policy YAML file to evaluate results against.",
)
def scan(
    target: str,
    depth: str,
    output_format: str,
    no_db: bool,
    max_size: int | None,
    exclude: tuple[str, ...],
    workers: int | None,
    policy_path: str | None,
) -> None:
    """Scan a file or directory for threats."""
    from icu.config import load_config
    from icu.reputation.database import ReputationDB

    cfg = load_config()
    eff_depth = depth if depth != "auto" else cfg.depth
    eff_max_size = max_size if max_size is not None else cfg.max_file_size
    eff_no_db = no_db or cfg.no_db
    eff_exclude = exclude + cfg.exclude

    console = get_console()
    db = None
    if not eff_no_db:
        try:
            db = ReputationDB()
        except Exception as exc:
            console.print(
                f"[dim]Warning: reputation DB unavailable: {exc}[/dim]"
            )

    policy_engine = None
    if policy_path is not None:
        from icu.policy.engine import PolicyEngine
        from icu.policy.loader import load_policy

        pol = load_policy(policy_path)
        policy_engine = PolicyEngine(pol)

    try:
        scanner = Scanner(
            db=db,
            max_file_size=eff_max_size,
            exclude=eff_exclude,
            max_workers=workers,
        )
        target_path = Path(target)

        if target_path.is_dir():
            results = scanner.scan_directory(target_path, depth=eff_depth)  # type: ignore[arg-type]
        else:
            results = [scanner.scan_file(target_path, depth=eff_depth)]  # type: ignore[arg-type]

        # Evaluate policy for each result if policy is active
        policy_results = None
        if policy_engine is not None:
            policy_results = [policy_engine.evaluate(r) for r in results]
            policy_engine.log_violations(results, policy_results)

        if output_format == "json":
            _output_json(results, policy_results)
        elif output_format == "sarif":
            _output_sarif(results)
        else:
            _output_table(results, console, policy_results)

        # Exit code: policy overrides risk-based exit if active
        if policy_results is not None:
            action_order = {"log": 0, "warn": 1, "block": 2}
            worst_action = max(
                (action_order.get(pr.action, 0) for pr in policy_results),
                default=0,
            )
            if worst_action >= 2:
                sys.exit(2)
            elif worst_action >= 1:
                sys.exit(1)
            else:
                sys.exit(0)

        # Exit code based on worst risk level
        worst = max(
            (RISK_LEVEL_ORDER[r.risk_level] for r in results), default=0
        )
        if worst >= RISK_LEVEL_ORDER["high"]:
            sys.exit(2)
        elif worst >= RISK_LEVEL_ORDER["medium"]:
            sys.exit(1)
        else:
            sys.exit(0)
    finally:
        if db is not None:
            db.close()


def _output_table(
    results: list[ScanResult],
    console: object,
    policy_results: list[PolicyResult] | None = None,
) -> None:
    for i, result in enumerate(results):
        print_scan_result(result)
        if policy_results is not None:
            print_policy_result(policy_results[i], file_path=result.file_path)
    if len(results) > 1:
        print_scan_summary(results)


def _output_json(
    results: list[ScanResult],
    policy_results: list[PolicyResult] | None = None,
) -> None:
    output: dict[str, object] = {
        "results": [
            {
                **r.to_dict(),
                **(
                    {"policy": policy_results[i].to_dict()}
                    if policy_results is not None
                    else {}
                ),
            }
            for i, r in enumerate(results)
        ],
        "summary": {
            "total_files": len(results),
            "clean": sum(1 for r in results if r.risk_level == "clean"),
            "warnings": sum(1 for r in results if r.risk_level in ("low", "medium")),
            "critical": sum(1 for r in results if r.risk_level in ("high", "critical")),
        },
    }
    click.echo(json.dumps(output, indent=2))


def _output_sarif(results: list[ScanResult]) -> None:
    sarif = {
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": [
            {
                "tool": {
                    "driver": {
                        "name": "icu",
                        "informationUri": "https://github.com/i-see-you/icu",
                        "rules": [],
                    }
                },
                "results": [],
            }
        ],
    }

    seen_rules: dict[str, int] = {}
    run = sarif["runs"][0]
    driver_rules: list[dict[str, object]] = run["tool"]["driver"]["rules"]  # type: ignore[index]
    sarif_results: list[dict[str, object]] = run["results"]  # type: ignore[index]

    for result in results:
        for finding in result.findings:
            if finding.rule_id not in seen_rules:
                seen_rules[finding.rule_id] = len(driver_rules)
                driver_rules.append(
                    {
                        "id": finding.rule_id,
                        "shortDescription": {"text": finding.description},
                    }
                )

            sarif_results.append(
                {
                    "ruleId": finding.rule_id,
                    "ruleIndex": seen_rules[finding.rule_id],
                    "level": _severity_to_sarif_level(finding.severity),
                    "message": {"text": finding.description},
                    "locations": [
                        {
                            "physicalLocation": {
                                "artifactLocation": {"uri": finding.file_path},
                                "region": {"startLine": finding.line_number},
                            }
                        }
                    ],
                }
            )

    click.echo(json.dumps(sarif, indent=2))


def _severity_to_sarif_level(severity: str) -> str:
    mapping = {
        "info": "note",
        "warning": "warning",
        "danger": "error",
        "critical": "error",
    }
    return mapping.get(severity, "warning")
