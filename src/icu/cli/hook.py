"""``icu hook`` — install / uninstall git pre-commit hooks."""

from __future__ import annotations

import sys

import click

from icu.integrations.hooks import (
    HookError,
    find_git_root,
    install_hook,
    uninstall_hook,
)
from icu.utils.formatting import get_console


@click.group()
def hook() -> None:
    """Manage ICU git pre-commit hooks."""


@hook.command()
def install() -> None:
    """Install the ICU pre-commit hook in the current repository."""
    console = get_console()
    git_root = find_git_root()
    if git_root is None:
        console.print("[bold red]Error:[/] not inside a git repository.")
        sys.exit(1)
    try:
        msg = install_hook(git_root)
    except HookError as exc:
        console.print(f"[bold red]Error:[/] {exc}")
        sys.exit(1)
    console.print(f"[green]{msg}[/green]")


@hook.command()
def uninstall() -> None:
    """Remove the ICU pre-commit hook from the current repository."""
    console = get_console()
    git_root = find_git_root()
    if git_root is None:
        console.print("[bold red]Error:[/] not inside a git repository.")
        sys.exit(1)
    try:
        msg = uninstall_hook(git_root)
    except HookError as exc:
        console.print(f"[bold red]Error:[/] {exc}")
        sys.exit(1)
    console.print(f"[green]{msg}[/green]")
