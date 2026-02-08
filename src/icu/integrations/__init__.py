"""Integrations — git hooks and pre-commit framework support."""

from __future__ import annotations

from icu.integrations.hooks import (
    ICU_HOOK_MARKER,
    HookError,
    find_git_root,
    generate_hook_script,
    install_hook,
    uninstall_hook,
)

__all__ = [
    "HookError",
    "ICU_HOOK_MARKER",
    "find_git_root",
    "generate_hook_script",
    "install_hook",
    "uninstall_hook",
]
