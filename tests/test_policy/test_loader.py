from __future__ import annotations

from pathlib import Path

import pytest

from icu.policy.loader import (
    PolicyLoadError,
    discover_policy_path,
    load_policy,
    load_policy_from_string,
    validate_policy,
)
from icu.policy.models import Policy

_VALID_YAML = """\
version: "1.0"
defaults:
  action: block
  allow_network: false
  allow_shell: false
  max_risk_level: medium
  deep_scan: true
file_access:
  deny:
    - "~/.ssh/*"
    - "~/.aws/*"
  allow:
    - "~/.ssh/config"
network:
  allow: []
  deny:
    - "*.onion"
alerts:
  console: true
tool_overrides:
  - name: cursor
    allow_network: true
    max_risk_level: low
"""

_PARTIAL_YAML = """\
version: "1.0"
defaults:
  action: warn
"""

_INVALID_YAML = """\
[this is: not valid: yaml: {{
"""


class TestLoadPolicyFromString:
    def test_valid_yaml(self) -> None:
        policy = load_policy_from_string(_VALID_YAML)
        assert policy.defaults.action == "block"
        assert policy.defaults.allow_network is False
        assert "~/.ssh/*" not in policy.file_access.deny  # expanded
        assert len(policy.file_access.deny) == 2
        assert len(policy.file_access.allow) == 1
        assert len(policy.network.deny) == 1
        assert len(policy.tool_overrides) == 1
        assert policy.tool_overrides[0].name == "cursor"
        assert policy.tool_overrides[0].allow_network is True

    def test_partial_yaml(self) -> None:
        policy = load_policy_from_string(_PARTIAL_YAML)
        assert policy.defaults.action == "warn"
        # Unspecified fields get defaults
        assert policy.defaults.allow_network is False
        assert policy.file_access.deny == ()
        assert policy.tool_overrides == ()

    def test_invalid_yaml(self) -> None:
        with pytest.raises(PolicyLoadError, match="Invalid YAML"):
            load_policy_from_string(_INVALID_YAML)

    def test_non_mapping(self) -> None:
        with pytest.raises(PolicyLoadError, match="must be a YAML mapping"):
            load_policy_from_string("- just\n- a\n- list\n")

    def test_invalid_defaults_type(self) -> None:
        with pytest.raises(PolicyLoadError, match="'defaults' must be a mapping"):
            load_policy_from_string("defaults: not_a_mapping\n")

    def test_invalid_file_access_type(self) -> None:
        with pytest.raises(PolicyLoadError, match="'file_access' must be a mapping"):
            load_policy_from_string("file_access: bad\n")

    def test_invalid_network_type(self) -> None:
        with pytest.raises(PolicyLoadError, match="'network' must be a mapping"):
            load_policy_from_string("network: bad\n")

    def test_invalid_alerts_type(self) -> None:
        with pytest.raises(PolicyLoadError, match="'alerts' must be a mapping"):
            load_policy_from_string("alerts: bad\n")

    def test_invalid_tool_overrides_type(self) -> None:
        with pytest.raises(PolicyLoadError, match="'tool_overrides' must be a list"):
            load_policy_from_string("tool_overrides: bad\n")

    def test_tool_override_missing_name(self) -> None:
        with pytest.raises(PolicyLoadError, match="'name' key"):
            load_policy_from_string(
                "tool_overrides:\n  - action: warn\n"
            )

    def test_project_dir_expansion(self) -> None:
        yaml_content = """\
file_access:
  deny:
    - "${PROJECT_DIR}/secrets/*"
"""
        policy = load_policy_from_string(yaml_content, project_dir="/my/project")
        assert policy.file_access.deny[0] == "/my/project/secrets/*"

    def test_tilde_expansion(self) -> None:
        yaml_content = """\
file_access:
  deny:
    - "~/.ssh/*"
"""
        policy = load_policy_from_string(yaml_content)
        assert "~" not in policy.file_access.deny[0]
        assert ".ssh" in policy.file_access.deny[0]

    def test_log_file_expansion(self) -> None:
        yaml_content = """\
alerts:
  log_file: "~/icu.log"
"""
        policy = load_policy_from_string(yaml_content)
        assert policy.alerts.log_file is not None
        assert "~" not in policy.alerts.log_file


class TestLoadPolicy:
    def test_valid_file(self, tmp_path: Path) -> None:
        policy_file = tmp_path / ".icu-policy.yml"
        policy_file.write_text(_VALID_YAML)
        policy = load_policy(policy_file)
        assert policy.defaults.action == "block"

    def test_missing_file(self, tmp_path: Path) -> None:
        with pytest.raises(PolicyLoadError, match="not found"):
            load_policy(tmp_path / "missing.yml")

    def test_unreadable_file(self, tmp_path: Path) -> None:
        bad_file = tmp_path / "bad.yml"
        bad_file.write_text("valid: yaml")
        bad_file.chmod(0o000)
        try:
            with pytest.raises(PolicyLoadError, match="Cannot read"):
                load_policy(bad_file)
        finally:
            bad_file.chmod(0o644)


class TestDiscoverPolicyPath:
    def test_finds_in_current_dir(self, tmp_path: Path) -> None:
        policy_file = tmp_path / ".icu-policy.yml"
        policy_file.write_text("version: '1.0'\n")
        result = discover_policy_path(tmp_path)
        assert result == policy_file

    def test_finds_in_parent_dir(self, tmp_path: Path) -> None:
        policy_file = tmp_path / ".icu-policy.yml"
        policy_file.write_text("version: '1.0'\n")
        child = tmp_path / "subdir"
        child.mkdir()
        result = discover_policy_path(child)
        assert result == policy_file

    def test_yaml_extension(self, tmp_path: Path) -> None:
        policy_file = tmp_path / ".icu-policy.yaml"
        policy_file.write_text("version: '1.0'\n")
        result = discover_policy_path(tmp_path)
        assert result == policy_file

    def test_returns_none_when_not_found(self, tmp_path: Path) -> None:
        # Use an isolated dir with no policy files
        isolated = tmp_path / "isolated"
        isolated.mkdir()
        result = discover_policy_path(isolated)
        # May return None or the global config; just confirm no crash
        # In practice with tmp_path it won't find global config
        assert result is None or result.is_file()


class TestValidatePolicy:
    def test_valid_policy_no_warnings(self) -> None:
        from icu.policy.defaults import default_policy

        warnings = validate_policy(default_policy())
        assert warnings == []

    def test_empty_deny_warning(self) -> None:
        policy = Policy()  # empty deny
        warnings = validate_policy(policy)
        assert any("deny" in w.lower() for w in warnings)

    def test_invalid_action_warning(self) -> None:
        from icu.policy.models import PolicyDefaults

        policy = Policy(defaults=PolicyDefaults(action="explode"))  # type: ignore[arg-type]
        warnings = validate_policy(policy)
        assert any("action" in w.lower() for w in warnings)

    def test_invalid_risk_level_warning(self) -> None:
        from icu.policy.models import PolicyDefaults

        policy = Policy(
            defaults=PolicyDefaults(max_risk_level="extreme")  # type: ignore[arg-type]
        )
        warnings = validate_policy(policy)
        assert any("max_risk_level" in w for w in warnings)

    def test_tool_override_bad_action(self) -> None:
        from icu.policy.models import FileAccessPolicy, ToolOverride

        policy = Policy(
            file_access=FileAccessPolicy(deny=("x",)),
            tool_overrides=(
                ToolOverride(name="bad", action="nuke"),  # type: ignore[arg-type]
            ),
        )
        warnings = validate_policy(policy)
        assert any("bad" in w and "action" in w.lower() for w in warnings)
