"""``icu init`` — bootstrap a project with policy + git hook."""

from __future__ import annotations

from pathlib import Path

import click

from icu.utils.formatting import get_console


@click.command("init")
@click.option(
    "--no-hook",
    is_flag=True,
    default=False,
    help="Skip git pre-commit hook installation.",
)
@click.option(
    "--policy-path",
    type=click.Path(),
    default=".icu-policy.yml",
    help="Output path for the policy file.",
)
def init_cmd(no_hook: bool, policy_path: str) -> None:
    """Set up ICU in the current project."""
    from icu.integrations.hooks import HookError, find_git_root, install_hook
    from icu.policy.defaults import default_policy_yaml

    console = get_console()
    dest = Path(policy_path)

    # Policy file
    if dest.exists():
        console.print(
            f"[dim]Policy file already exists:[/dim] {dest}"
        )
    else:
        dest.write_text(default_policy_yaml(), encoding="utf-8")
        console.print(
            f"[green]Created policy file:[/green] {dest}"
        )

    # Git hook
    if no_hook:
        return

    git_root = find_git_root()
    if git_root is None:
        console.print(
            "[dim]Not a git repository — skipping hook.[/dim]"
        )
        return

    try:
        msg = install_hook(git_root)
        console.print(f"[green]{msg}[/green]")
    except HookError as exc:
        console.print(f"[yellow]Hook:[/yellow] {exc}")
