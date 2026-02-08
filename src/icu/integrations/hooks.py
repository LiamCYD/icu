"""Git pre-commit hook generation, installation, and removal."""

from __future__ import annotations

from pathlib import Path

ICU_HOOK_MARKER = "# ICU-HOOK-MANAGED"

_HOOK_SCRIPT = f"""\
#!/usr/bin/env bash
{ICU_HOOK_MARKER}
# Pre-commit hook installed by ICU — AI supply chain firewall.
# Scans staged files for prompt injection, data exfiltration, and obfuscation.

set -euo pipefail

staged_files=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$staged_files" ]; then
    exit 0
fi

failed=0
while IFS= read -r file; do
    if [ -f "$file" ]; then
        if ! icu scan "$file" --depth fast; then
            exit_code=$?
            if [ "$exit_code" -eq 2 ]; then
                failed=1
            fi
        fi
    fi
done <<< "$staged_files"

if [ "$failed" -ne 0 ]; then
    echo ""
    echo "ICU: commit blocked — high/critical findings detected."
    echo "Fix the issues above or use 'git commit --no-verify' to bypass."
    exit 1
fi
"""


class HookError(Exception):
    """Error during hook install/uninstall."""


def generate_hook_script() -> str:
    """Return the bash pre-commit hook script."""
    return _HOOK_SCRIPT


def find_git_root(start: Path | None = None) -> Path | None:
    """Walk up from *start* (default cwd) looking for a ``.git/`` directory."""
    current = (start or Path.cwd()).resolve()
    while True:
        if (current / ".git").is_dir():
            return current
        parent = current.parent
        if parent == current:
            return None
        current = parent


def install_hook(git_root: Path) -> str:
    """Install the ICU pre-commit hook. Returns a status message."""
    hooks_dir = git_root / ".git" / "hooks"
    hook_path = hooks_dir / "pre-commit"

    if hook_path.exists():
        try:
            content = hook_path.read_text(encoding="utf-8")
        except OSError as exc:
            raise HookError(f"Cannot read existing hook: {exc}") from exc

        if ICU_HOOK_MARKER in content:
            return "ICU pre-commit hook is already installed."

        raise HookError(
            "A pre-commit hook already exists and was not installed by ICU. "
            "Remove it manually or use a hook manager like pre-commit."
        )

    try:
        hooks_dir.mkdir(parents=True, exist_ok=True)
        hook_path.write_text(_HOOK_SCRIPT, encoding="utf-8")
        hook_path.chmod(0o755)
    except OSError as exc:
        raise HookError(f"Failed to install hook: {exc}") from exc

    return "ICU pre-commit hook installed."


def uninstall_hook(git_root: Path) -> str:
    """Remove the ICU pre-commit hook. Returns a status message."""
    hook_path = git_root / ".git" / "hooks" / "pre-commit"

    if not hook_path.exists():
        return "No pre-commit hook found."

    try:
        content = hook_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise HookError(f"Cannot read hook: {exc}") from exc

    if ICU_HOOK_MARKER not in content:
        return "Pre-commit hook was not installed by ICU — leaving it untouched."

    try:
        hook_path.unlink()
    except OSError as exc:
        raise HookError(f"Failed to remove hook: {exc}") from exc

    return "ICU pre-commit hook removed."
