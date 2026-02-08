from __future__ import annotations

import sys
from typing import TYPE_CHECKING

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

if TYPE_CHECKING:
    from icu.analyzer.models import Finding, ScanResult
    from icu.policy.models import PolicyResult

SEVERITY_COLORS: dict[str, str] = {
    "info": "cyan",
    "warning": "yellow",
    "danger": "red",
    "critical": "bold red",
}

RISK_COLORS: dict[str, str] = {
    "clean": "green",
    "low": "cyan",
    "medium": "yellow",
    "high": "red",
    "critical": "bold red",
}

_console = Console(stderr=True, file=sys.stderr)


def get_console() -> Console:
    return _console


def format_finding(finding: Finding) -> Text:
    color = SEVERITY_COLORS.get(finding.severity, "white")
    text = Text()
    text.append(f"[{finding.rule_id}]", style="bold " + color)
    text.append(f" {finding.description}", style=color)
    text.append(f"\n  File: {finding.file_path}:{finding.line_number}", style="dim")
    if finding.matched_text:
        text.append(f"\n  Match: {finding.matched_text}", style="dim italic")
    return text


def format_scan_result(result: ScanResult) -> Panel:
    risk_color = RISK_COLORS.get(result.risk_level, "white")

    table = Table(show_header=True, expand=True, padding=(0, 1))
    table.add_column("Rule", style="bold", width=8)
    table.add_column("Severity", width=10)
    table.add_column("Description")
    table.add_column("Location", width=20)

    for finding in result.findings:
        sev_color = SEVERITY_COLORS.get(finding.severity, "white")
        table.add_row(
            finding.rule_id,
            Text(finding.severity.upper(), style=sev_color),
            finding.description,
            f"{finding.file_path}:{finding.line_number}",
        )

    title = Text()
    title.append("ICU Scan: ", style="bold")
    title.append(result.file_path, style="bold white")

    subtitle = Text()
    subtitle.append("Risk: ", style="dim")
    subtitle.append(result.risk_level.upper(), style=risk_color)
    subtitle.append(f"  |  Findings: {len(result.findings)}", style="dim")
    subtitle.append(f"  |  Time: {result.scan_time_ms:.1f}ms", style="dim")

    return Panel(
        table if result.findings else Text(
            "No findings — file is clean.", style="green"
        ),
        title=title,
        subtitle=subtitle,
        border_style=risk_color,
    )


def print_scan_result(result: ScanResult) -> None:
    _console.print(format_scan_result(result))


ACTION_COLORS: dict[str, str] = {
    "log": "green",
    "warn": "yellow",
    "block": "bold red",
}


def format_policy_result(result: PolicyResult, file_path: str = "") -> Panel:
    action_color = ACTION_COLORS.get(result.action, "white")

    if result.passed:
        body: Text | Table = Text("Policy PASSED — no violations.", style="green")
    else:
        table = Table(show_header=True, expand=True, padding=(0, 1))
        table.add_column("Rule", style="bold", width=14)
        table.add_column("Severity", width=10)
        table.add_column("Description")

        for v in result.violations:
            sev_color = SEVERITY_COLORS.get(v.severity, "white")
            table.add_row(
                v.rule,
                Text(v.severity.upper(), style=sev_color),
                v.description,
            )
        body = table

    title = Text()
    title.append("Policy: ", style="bold")
    if file_path:
        title.append(file_path, style="bold white")

    subtitle = Text()
    subtitle.append("Action: ", style="dim")
    subtitle.append(result.action.upper(), style=action_color)
    subtitle.append(f"  |  Violations: {len(result.violations)}", style="dim")

    return Panel(
        body,
        title=title,
        subtitle=subtitle,
        border_style=action_color,
    )


def print_policy_result(
    result: PolicyResult, file_path: str = ""
) -> None:
    _console.print(format_policy_result(result, file_path))
