"""Project and global configuration loading."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import yaml

_CONFIG_FILENAMES = (".icu.yml", ".icu.yaml")
_GLOBAL_CONFIG = Path("~/.icu/config.yml").expanduser()


@dataclass(frozen=True, slots=True)
class ICUConfig:
    """Merged configuration from project + global files."""

    depth: str = "auto"
    max_file_size: int = 1_048_576
    exclude: tuple[str, ...] = ()
    policy_path: str | None = None
    no_db: bool = False


def load_config(start: Path | None = None) -> ICUConfig:
    """Load config by walking up from *start*, falling back to global.

    Project config overrides global config.
    """
    global_data: dict[str, object] = {}
    project_data: dict[str, object] = {}

    if _GLOBAL_CONFIG.is_file():
        global_data = _read_yaml(_GLOBAL_CONFIG)

    project_path = _discover_config(start)
    if project_path is not None:
        project_data = _read_yaml(project_path)

    merged = {**global_data, **project_data}

    # Overlay environment variables (between YAML config and CLI flags)
    env_depth = os.environ.get("ICU_DEPTH")
    if env_depth is not None:
        merged["depth"] = env_depth

    env_max_size = os.environ.get("ICU_MAX_SIZE")
    if env_max_size is not None:
        merged["max_file_size"] = env_max_size

    env_no_db = os.environ.get("ICU_NO_DB")
    if env_no_db is not None:
        merged["no_db"] = env_no_db.lower() in ("1", "true", "yes")

    env_policy = os.environ.get("ICU_POLICY")
    if env_policy is not None:
        merged["policy_path"] = env_policy

    # Also load .icuignore patterns
    ignore_patterns = load_icuignore(start)

    # Merge exclude from config + icuignore
    config_exclude = merged.get("exclude", ())
    if isinstance(config_exclude, list):
        config_exclude = tuple(str(p) for p in config_exclude)
    elif not isinstance(config_exclude, tuple):
        config_exclude = ()

    all_exclude = tuple(config_exclude) + ignore_patterns

    return ICUConfig(
        depth=str(merged.get("depth", "auto")),
        max_file_size=_int_or_default(
            merged.get("max_file_size"), 1_048_576
        ),
        exclude=all_exclude,
        policy_path=_str_or_none(merged.get("policy_path")),
        no_db=bool(merged.get("no_db", False)),
    )


def load_icuignore(start: Path | None = None) -> tuple[str, ...]:
    """Walk up from *start* looking for ``.icuignore``, parse patterns."""
    current = (start or Path.cwd()).resolve()
    while True:
        candidate = current / ".icuignore"
        if candidate.is_file():
            return _parse_icuignore(candidate)
        parent = current.parent
        if parent == current:
            return ()
        current = parent


def _discover_config(start: Path | None = None) -> Path | None:
    """Walk up from *start* looking for a config file."""
    current = (start or Path.cwd()).resolve()
    while True:
        for name in _CONFIG_FILENAMES:
            candidate = current / name
            if candidate.is_file():
                return candidate
        parent = current.parent
        if parent == current:
            return None
        current = parent


def _read_yaml(path: Path) -> dict[str, object]:
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {}


def _parse_icuignore(path: Path) -> tuple[str, ...]:
    patterns: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            patterns.append(stripped)
    return tuple(patterns)


def _int_or_default(val: object, default: int) -> int:
    if val is None:
        return default
    try:
        return int(val)  # type: ignore[call-overload, no-any-return]
    except (TypeError, ValueError):
        return default


def _str_or_none(val: object) -> str | None:
    if val is None:
        return None
    return str(val)
