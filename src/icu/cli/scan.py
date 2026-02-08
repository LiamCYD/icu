from __future__ import annotations

import json
import sys
from pathlib import Path

import click

from icu.analyzer.models import RISK_LEVEL_ORDER, ScanResult
from icu.analyzer.scanner import Scanner
from icu.utils.formatting import get_console, print_scan_result


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
def scan(target: str, depth: str, output_format: str) -> None:
    """Scan a file or directory for threats."""
    scanner = Scanner()
    target_path = Path(target)
    console = get_console()

    if target_path.is_dir():
        results = scanner.scan_directory(target_path, depth=depth)  # type: ignore[arg-type]
    else:
        results = [scanner.scan_file(target_path, depth=depth)]  # type: ignore[arg-type]

    if output_format == "json":
        _output_json(results)
    elif output_format == "sarif":
        _output_sarif(results)
    else:
        _output_table(results, console)

    # Exit code based on worst risk level
    worst = max((RISK_LEVEL_ORDER[r.risk_level] for r in results), default=0)
    if worst >= RISK_LEVEL_ORDER["high"]:
        sys.exit(2)
    elif worst >= RISK_LEVEL_ORDER["medium"]:
        sys.exit(1)
    else:
        sys.exit(0)


def _output_table(results: list[ScanResult], console: object) -> None:
    for result in results:
        print_scan_result(result)


def _output_json(results: list[ScanResult]) -> None:
    output = {
        "results": [r.to_dict() for r in results],
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
