from __future__ import annotations

import os
from pathlib import Path

import yaml

from icu.policy.models import (
    AlertsConfig,
    FileAccessPolicy,
    NetworkPolicy,
    Policy,
    PolicyDefaults,
    ToolOverride,
)

_POLICY_FILENAMES = (".icu-policy.yml", ".icu-policy.yaml")
_GLOBAL_CONFIG = Path("~/.config/icu/policy.yml").expanduser()


class PolicyLoadError(Exception):
    """Raised when a policy file is malformed."""


def discover_policy_path(start_dir: str | Path | None = None) -> Path | None:
    """Walk up from *start_dir* looking for a policy file.

    Falls back to ``~/.config/icu/policy.yml``.
    Returns ``None`` if nothing is found.
    """
    if start_dir is None:
        start_dir = Path.cwd()
    current = Path(start_dir).resolve()

    while True:
        for name in _POLICY_FILENAMES:
            candidate = current / name
            if candidate.is_file():
                return candidate
        parent = current.parent
        if parent == current:
            break
        current = parent

    if _GLOBAL_CONFIG.is_file():
        return _GLOBAL_CONFIG

    return None


def load_policy(
    path: str | Path,
    project_dir: str | Path | None = None,
) -> Policy:
    """Parse a YAML policy file and return a ``Policy``."""
    path = Path(path)
    if not path.is_file():
        raise PolicyLoadError(f"Policy file not found: {path}")

    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise PolicyLoadError(f"Cannot read {path}: {exc}") from exc

    return load_policy_from_string(text, project_dir=project_dir)


def load_policy_from_string(
    content: str,
    project_dir: str | Path | None = None,
) -> Policy:
    """Parse YAML content and return a ``Policy``."""
    try:
        data = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        raise PolicyLoadError(f"Invalid YAML: {exc}") from exc

    if not isinstance(data, dict):
        raise PolicyLoadError("Policy must be a YAML mapping")

    proj = str(project_dir) if project_dir else str(Path.cwd())

    def _expand(value: str) -> str:
        value = value.replace("${PROJECT_DIR}", proj)
        return os.path.expanduser(value)

    def _expand_list(raw: object) -> tuple[str, ...]:
        if not isinstance(raw, list):
            return ()
        return tuple(_expand(str(s)) for s in raw)

    # --- defaults ---
    raw_defaults = data.get("defaults", {}) or {}
    if not isinstance(raw_defaults, dict):
        raise PolicyLoadError("'defaults' must be a mapping")

    defaults = PolicyDefaults(
        action=raw_defaults.get("action", "block"),
        allow_network=bool(raw_defaults.get("allow_network", False)),
        allow_shell=bool(raw_defaults.get("allow_shell", False)),
        max_risk_level=raw_defaults.get("max_risk_level", "medium"),
        deep_scan=bool(raw_defaults.get("deep_scan", True)),
    )

    # --- file_access ---
    raw_fa = data.get("file_access", {}) or {}
    if not isinstance(raw_fa, dict):
        raise PolicyLoadError("'file_access' must be a mapping")

    file_access = FileAccessPolicy(
        deny=_expand_list(raw_fa.get("deny", [])),
        allow=_expand_list(raw_fa.get("allow", [])),
    )

    # --- network ---
    raw_net = data.get("network", {}) or {}
    if not isinstance(raw_net, dict):
        raise PolicyLoadError("'network' must be a mapping")

    network = NetworkPolicy(
        allow=_expand_list(raw_net.get("allow", [])),
        deny=_expand_list(raw_net.get("deny", [])),
    )

    # --- alerts ---
    raw_alerts = data.get("alerts", {}) or {}
    if not isinstance(raw_alerts, dict):
        raise PolicyLoadError("'alerts' must be a mapping")

    log_file = raw_alerts.get("log_file")
    if log_file is not None:
        log_file = _expand(str(log_file))

    alerts = AlertsConfig(
        console=bool(raw_alerts.get("console", True)),
        log_file=log_file,
    )

    # --- tool_overrides ---
    raw_overrides = data.get("tool_overrides") or []
    if not isinstance(raw_overrides, list):
        raise PolicyLoadError("'tool_overrides' must be a list")

    overrides: list[ToolOverride] = []
    for item in raw_overrides:
        if not isinstance(item, dict) or "name" not in item:
            raise PolicyLoadError(
                "Each tool override must be a mapping with a 'name' key"
            )
        overrides.append(
            ToolOverride(
                name=item["name"],
                action=item.get("action"),
                allow_network=item.get("allow_network"),
                allow_shell=item.get("allow_shell"),
                max_risk_level=item.get("max_risk_level"),
            )
        )

    return Policy(
        defaults=defaults,
        file_access=file_access,
        network=network,
        alerts=alerts,
        tool_overrides=tuple(overrides),
    )


def validate_policy(policy: Policy) -> list[str]:
    """Return a list of warning strings for potential issues."""
    warnings: list[str] = []

    valid_actions = {"block", "warn", "log"}
    if policy.defaults.action not in valid_actions:
        warnings.append(
            f"Unknown default action '{policy.defaults.action}' "
            f"(expected one of {valid_actions})"
        )

    valid_risk = {"clean", "low", "medium", "high", "critical"}
    if policy.defaults.max_risk_level not in valid_risk:
        warnings.append(
            f"Unknown max_risk_level '{policy.defaults.max_risk_level}' "
            f"(expected one of {valid_risk})"
        )

    if not policy.file_access.deny:
        warnings.append(
            "No file access deny patterns — sensitive files are unprotected"
        )

    for override in policy.tool_overrides:
        if override.action is not None and override.action not in valid_actions:
            warnings.append(
                f"Tool override '{override.name}' has unknown action "
                f"'{override.action}'"
            )
        if (
            override.max_risk_level is not None
            and override.max_risk_level not in valid_risk
        ):
            warnings.append(
                f"Tool override '{override.name}' has unknown "
                f"max_risk_level '{override.max_risk_level}'"
            )

    return warnings
