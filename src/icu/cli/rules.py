"""``icu rules`` — list and filter detection rules."""

from __future__ import annotations

import re

import click

from icu.analyzer.patterns import DETECTION_RULES
from icu.utils.formatting import get_console


@click.command()
@click.option(
    "--category",
    type=click.Choice(
        [
            "prompt_injection",
            "data_exfiltration",
            "obfuscation",
            "suspicious_commands",
            "network_suspicious",
        ]
    ),
    default=None,
    help="Filter by category.",
)
@click.option(
    "--severity",
    type=click.Choice(["info", "warning", "danger", "critical"]),
    default=None,
    help="Filter by severity.",
)
@click.option(
    "--search",
    default=None,
    help="Regex search against rule ID and description.",
)
def rules(
    category: str | None,
    severity: str | None,
    search: str | None,
) -> None:
    """List detection rules."""
    from rich.table import Table
    from rich.text import Text

    console = get_console()
    filtered = list(DETECTION_RULES)

    if category is not None:
        filtered = [r for r in filtered if r.category == category]
    if severity is not None:
        filtered = [r for r in filtered if r.severity == severity]
    if search is not None:
        pat = re.compile(search, re.IGNORECASE)
        filtered = [
            r
            for r in filtered
            if pat.search(r.rule_id) or pat.search(r.description)
        ]

    table = Table(show_header=True, expand=True, padding=(0, 1))
    table.add_column("Rule", style="bold", width=8)
    table.add_column("Category", width=22)
    table.add_column("Severity", width=10)
    table.add_column("Description")
    table.add_column("Pattern", overflow="fold", width=30)

    severity_colors = {
        "info": "cyan",
        "warning": "yellow",
        "danger": "red",
        "critical": "bold red",
    }

    for r in filtered:
        color = severity_colors.get(r.severity, "white")
        table.add_row(
            r.rule_id,
            r.category,
            Text(r.severity.upper(), style=color),
            r.description,
            Text(r.pattern),
        )

    subtitle = Text()
    subtitle.append(
        f"Showing {len(filtered)} of {len(DETECTION_RULES)} rules",
        style="dim",
    )

    console.print(table)
    console.print(subtitle)
