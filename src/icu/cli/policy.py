from __future__ import annotations

import json
import sys
from pathlib import Path

import click

from icu.analyzer.scanner import Scanner
from icu.policy.defaults import default_policy_yaml
from icu.policy.engine import PolicyEngine
from icu.policy.loader import (
    PolicyLoadError,
    discover_policy_path,
    load_policy,
    validate_policy,
)
from icu.utils.formatting import (
    get_console,
    print_policy_result,
    print_scan_result,
)


@click.group()
def policy() -> None:
    """Manage ICU security policies."""


@policy.command()
@click.option(
    "-o",
    "--output",
    "output_path",
    type=click.Path(),
    default=".icu-policy.yml",
    help="Output path for the policy file.",
)
@click.option(
    "--force",
    is_flag=True,
    default=False,
    help="Overwrite existing policy file.",
)
def init(output_path: str, force: bool) -> None:
    """Generate a default policy file."""
    dest = Path(output_path)
    console = get_console()

    if dest.exists() and not force:
        console.print(
            f"[yellow]Policy file already exists:[/yellow] {dest}\n"
            "Use --force to overwrite."
        )
        sys.exit(1)

    dest.write_text(default_policy_yaml(), encoding="utf-8")
    console.print(f"[green]Policy written to[/green] {dest}")


@policy.command()
@click.option(
    "-p",
    "--policy-file",
    "policy_path",
    type=click.Path(),
    default=None,
    help="Path to policy file.",
)
def check(policy_path: str | None) -> None:
    """Validate a policy file."""
    console = get_console()

    if policy_path is None:
        discovered = discover_policy_path()
        if discovered is None:
            console.print("[red]No policy file found.[/red]")
            sys.exit(2)
        policy_path = str(discovered)

    try:
        pol = load_policy(policy_path)
    except PolicyLoadError as exc:
        console.print(f"[red]Error:[/red] {exc}")
        sys.exit(2)

    warnings = validate_policy(pol)
    if warnings:
        for w in warnings:
            console.print(f"[yellow]Warning:[/yellow] {w}")
        sys.exit(1)

    console.print(f"[green]Policy is valid:[/green] {policy_path}")


@policy.command("test")
@click.argument("target", type=click.Path(exists=True))
@click.option(
    "-p",
    "--policy-file",
    "policy_path",
    type=click.Path(),
    default=None,
    help="Path to policy file.",
)
@click.option(
    "-t",
    "--tool",
    "tool_name",
    default=None,
    help="Tool name for override lookup.",
)
@click.option(
    "--format",
    "output_format",
    type=click.Choice(["table", "json"]),
    default="table",
    help="Output format.",
)
def test(
    target: str,
    policy_path: str | None,
    tool_name: str | None,
    output_format: str,
) -> None:
    """Scan a target and evaluate against policy."""
    console = get_console()

    # Load policy
    if policy_path is not None:
        try:
            pol = load_policy(policy_path)
        except PolicyLoadError as exc:
            console.print(f"[red]Error:[/red] {exc}")
            sys.exit(2)
    else:
        discovered = discover_policy_path()
        if discovered is not None:
            try:
                pol = load_policy(discovered)
            except PolicyLoadError as exc:
                console.print(f"[red]Error:[/red] {exc}")
                sys.exit(2)
        else:
            from icu.policy.defaults import default_policy

            pol = default_policy()

    engine = PolicyEngine(pol)
    scanner = Scanner()
    target_path = Path(target)

    if target_path.is_dir():
        results = scanner.scan_directory(target_path)
    else:
        results = [scanner.scan_file(target_path)]

    # Evaluate each result
    worst_action = "log"
    all_output: list[dict[str, object]] = []

    for scan_result in results:
        policy_result = engine.evaluate(scan_result, tool_name)

        if output_format == "table":
            print_scan_result(scan_result)
            print_policy_result(policy_result, scan_result.file_path)
        else:
            all_output.append(
                {
                    "scan": scan_result.to_dict(),
                    "policy": policy_result.to_dict(),
                }
            )

        # Track worst action
        action_order = {"log": 0, "warn": 1, "block": 2}
        if action_order.get(policy_result.action, 0) > action_order.get(
            worst_action, 0
        ):
            worst_action = policy_result.action

    if output_format == "json":
        click.echo(json.dumps(all_output, indent=2))

    # Exit code: 0=pass, 1=warn, 2=block
    if worst_action == "block":
        sys.exit(2)
    elif worst_action == "warn":
        sys.exit(1)
    else:
        sys.exit(0)
