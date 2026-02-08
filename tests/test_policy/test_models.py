from __future__ import annotations

import json

import pytest

from icu.policy.models import (
    AlertsConfig,
    FileAccessPolicy,
    NetworkPolicy,
    Policy,
    PolicyDefaults,
    PolicyResult,
    PolicyViolation,
    ToolOverride,
)


class TestPolicyDefaults:
    def test_defaults(self) -> None:
        d = PolicyDefaults()
        assert d.action == "block"
        assert d.allow_network is False
        assert d.allow_shell is False
        assert d.max_risk_level == "medium"
        assert d.deep_scan is True

    def test_frozen(self) -> None:
        d = PolicyDefaults()
        with pytest.raises(AttributeError):
            d.action = "warn"  # type: ignore[misc]

    def test_custom_values(self) -> None:
        d = PolicyDefaults(action="warn", allow_network=True, max_risk_level="high")
        assert d.action == "warn"
        assert d.allow_network is True
        assert d.max_risk_level == "high"


class TestFileAccessPolicy:
    def test_defaults(self) -> None:
        fa = FileAccessPolicy()
        assert fa.deny == ()
        assert fa.allow == ()

    def test_frozen(self) -> None:
        fa = FileAccessPolicy()
        with pytest.raises(AttributeError):
            fa.deny = ("foo",)  # type: ignore[misc]

    def test_with_patterns(self) -> None:
        fa = FileAccessPolicy(deny=("~/.ssh/*",), allow=("~/.ssh/config",))
        assert "~/.ssh/*" in fa.deny
        assert "~/.ssh/config" in fa.allow


class TestNetworkPolicy:
    def test_defaults(self) -> None:
        n = NetworkPolicy()
        assert n.allow == ()
        assert n.deny == ()


class TestAlertsConfig:
    def test_defaults(self) -> None:
        a = AlertsConfig()
        assert a.console is True
        assert a.log_file is None

    def test_with_log_file(self) -> None:
        a = AlertsConfig(log_file="/var/log/icu.log")
        assert a.log_file == "/var/log/icu.log"


class TestToolOverride:
    def test_minimal(self) -> None:
        o = ToolOverride(name="cursor")
        assert o.name == "cursor"
        assert o.action is None
        assert o.allow_network is None

    def test_with_overrides(self) -> None:
        o = ToolOverride(name="copilot", action="warn", allow_network=True)
        assert o.action == "warn"
        assert o.allow_network is True

    def test_frozen(self) -> None:
        o = ToolOverride(name="x")
        with pytest.raises(AttributeError):
            o.name = "y"  # type: ignore[misc]


class TestPolicy:
    def test_defaults(self) -> None:
        p = Policy()
        assert p.defaults.action == "block"
        assert p.file_access.deny == ()
        assert p.tool_overrides == ()

    def test_to_dict(self) -> None:
        p = Policy(
            defaults=PolicyDefaults(action="warn"),
            file_access=FileAccessPolicy(deny=("~/.ssh/*",)),
            tool_overrides=(
                ToolOverride(name="cursor", action="log"),
            ),
        )
        d = p.to_dict()
        assert d["defaults"]["action"] == "warn"
        assert d["file_access"]["deny"] == ["~/.ssh/*"]
        assert len(d["tool_overrides"]) == 1
        assert d["tool_overrides"][0]["name"] == "cursor"
        assert d["tool_overrides"][0]["action"] == "log"
        # None fields should be omitted
        assert "allow_network" not in d["tool_overrides"][0]

    def test_frozen(self) -> None:
        p = Policy()
        with pytest.raises(AttributeError):
            p.defaults = PolicyDefaults()  # type: ignore[misc]


class TestPolicyViolation:
    def test_fields(self) -> None:
        v = PolicyViolation(
            rule="risk_level",
            description="too risky",
            severity="high",
        )
        assert v.rule == "risk_level"
        assert v.description == "too risky"
        assert v.severity == "high"

    def test_frozen(self) -> None:
        v = PolicyViolation(rule="x", description="y", severity="z")
        with pytest.raises(AttributeError):
            v.rule = "a"  # type: ignore[misc]


class TestPolicyResult:
    def test_passed_when_log(self) -> None:
        r = PolicyResult(action="log")
        assert r.passed is True

    def test_not_passed_when_block(self) -> None:
        r = PolicyResult(action="block")
        assert r.passed is False

    def test_not_passed_when_warn(self) -> None:
        r = PolicyResult(action="warn")
        assert r.passed is False

    def test_to_dict(self) -> None:
        v = PolicyViolation(rule="risk_level", description="bad", severity="high")
        r = PolicyResult(action="block", violations=(v,))
        d = r.to_dict()
        assert d["action"] == "block"
        assert d["passed"] is False
        assert len(d["violations"]) == 1
        assert d["violations"][0]["rule"] == "risk_level"

    def test_to_json(self) -> None:
        r = PolicyResult(action="log")
        parsed = json.loads(r.to_json())
        assert parsed["passed"] is True
        assert parsed["action"] == "log"
        assert parsed["violations"] == []

    def test_empty_violations(self) -> None:
        r = PolicyResult(action="log")
        assert r.violations == ()
