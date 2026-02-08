from __future__ import annotations

import time

import pytest

from icu.analyzer.models import Finding, ScanResult
from icu.policy.defaults import default_policy
from icu.policy.engine import PolicyEngine
from icu.policy.models import (
    FileAccessPolicy,
    Policy,
    PolicyDefaults,
    ToolOverride,
)


@pytest.fixture
def engine() -> PolicyEngine:
    return PolicyEngine(default_policy())


def _make_result(
    file_path: str = "test.py",
    risk_level: str = "clean",
    findings: tuple[Finding, ...] = (),
) -> ScanResult:
    return ScanResult(
        file_path=file_path,
        risk_level=risk_level,
        findings=findings,
        sha256="abc123",
    )


class TestRiskLevelCheck:
    def test_clean_passes(self, engine: PolicyEngine) -> None:
        result = engine.evaluate(_make_result(risk_level="clean"))
        assert result.passed

    def test_low_passes(self, engine: PolicyEngine) -> None:
        result = engine.evaluate(_make_result(risk_level="low"))
        assert result.passed

    def test_medium_passes(self, engine: PolicyEngine) -> None:
        result = engine.evaluate(_make_result(risk_level="medium"))
        assert result.passed

    def test_high_blocked(self, engine: PolicyEngine) -> None:
        result = engine.evaluate(_make_result(risk_level="high"))
        assert not result.passed
        assert result.action == "block"
        assert any(v.rule == "risk_level" for v in result.violations)

    def test_critical_blocked(self, engine: PolicyEngine) -> None:
        result = engine.evaluate(_make_result(risk_level="critical"))
        assert not result.passed
        assert result.action == "block"

    def test_custom_max_risk_level(self) -> None:
        policy = Policy(
            defaults=PolicyDefaults(
                action="warn",
                max_risk_level="high",
            ),
            file_access=FileAccessPolicy(deny=("x",)),
        )
        engine = PolicyEngine(policy)
        result = engine.evaluate(_make_result(risk_level="high"))
        assert result.passed

        result = engine.evaluate(_make_result(risk_level="critical"))
        assert not result.passed
        assert result.action == "warn"


class TestFileAccessCheck:
    def test_denied_path(self) -> None:
        policy = Policy(
            defaults=PolicyDefaults(),
            file_access=FileAccessPolicy(
                deny=("/secrets/*",),
            ),
        )
        engine = PolicyEngine(policy)
        result = engine.evaluate(_make_result(file_path="/secrets/key.pem"))
        assert not result.passed
        assert any(v.rule == "file_access" for v in result.violations)

    def test_allow_overrides_deny(self) -> None:
        policy = Policy(
            defaults=PolicyDefaults(),
            file_access=FileAccessPolicy(
                deny=("/secrets/*",),
                allow=("/secrets/public.pem",),
            ),
        )
        engine = PolicyEngine(policy)
        result = engine.evaluate(_make_result(file_path="/secrets/public.pem"))
        # Allow overrides deny — no file_access violation
        assert not any(v.rule == "file_access" for v in result.violations)

    def test_no_match_passes(self, engine: PolicyEngine) -> None:
        result = engine.evaluate(_make_result(file_path="/safe/file.py"))
        assert not any(v.rule == "file_access" for v in result.violations)


class TestNetworkFindingsCheck:
    def test_network_finding_blocked(self, engine: PolicyEngine) -> None:
        finding = Finding(
            rule_id="NS-001",
            description="Suspicious network call",
            severity="danger",
            file_path="test.py",
            line_number=1,
            matched_text="curl",
        )
        result = engine.evaluate(
            _make_result(findings=(finding,), risk_level="high")
        )
        assert any(v.rule == "network" for v in result.violations)

    def test_de_010_blocked(self, engine: PolicyEngine) -> None:
        finding = Finding(
            rule_id="DE-010",
            description="Data exfiltration via DNS",
            severity="critical",
            file_path="test.py",
            line_number=1,
            matched_text="dns",
        )
        result = engine.evaluate(
            _make_result(findings=(finding,), risk_level="critical")
        )
        assert any(v.rule == "network" for v in result.violations)

    def test_network_allowed_skips_check(self) -> None:
        policy = Policy(
            defaults=PolicyDefaults(allow_network=True),
            file_access=FileAccessPolicy(deny=("x",)),
        )
        engine = PolicyEngine(policy)
        finding = Finding(
            rule_id="NS-001",
            description="Network call",
            severity="danger",
            file_path="test.py",
            line_number=1,
            matched_text="curl",
        )
        result = engine.evaluate(_make_result(findings=(finding,)))
        assert not any(v.rule == "network" for v in result.violations)


class TestShellFindingsCheck:
    def test_shell_finding_blocked(self, engine: PolicyEngine) -> None:
        finding = Finding(
            rule_id="SC-001",
            description="Shell command execution",
            severity="danger",
            file_path="test.py",
            line_number=1,
            matched_text="os.system",
        )
        result = engine.evaluate(
            _make_result(findings=(finding,), risk_level="high")
        )
        assert any(v.rule == "shell" for v in result.violations)

    def test_shell_allowed_skips_check(self) -> None:
        policy = Policy(
            defaults=PolicyDefaults(allow_shell=True),
            file_access=FileAccessPolicy(deny=("x",)),
        )
        engine = PolicyEngine(policy)
        finding = Finding(
            rule_id="SC-001",
            description="Shell command execution",
            severity="danger",
            file_path="test.py",
            line_number=1,
            matched_text="os.system",
        )
        result = engine.evaluate(_make_result(findings=(finding,)))
        assert not any(v.rule == "shell" for v in result.violations)


class TestToolOverrides:
    def test_override_relaxes_risk_level(self) -> None:
        policy = Policy(
            defaults=PolicyDefaults(max_risk_level="medium"),
            file_access=FileAccessPolicy(deny=("x",)),
            tool_overrides=(
                ToolOverride(name="cursor", max_risk_level="critical"),
            ),
        )
        engine = PolicyEngine(policy)
        # Without tool name — blocked at high
        result = engine.evaluate(_make_result(risk_level="high"))
        assert not result.passed

        # With tool name — passes at high (max is critical)
        result = engine.evaluate(_make_result(risk_level="high"), tool_name="cursor")
        assert result.passed

    def test_override_changes_action(self) -> None:
        policy = Policy(
            defaults=PolicyDefaults(action="block", max_risk_level="low"),
            file_access=FileAccessPolicy(deny=("x",)),
            tool_overrides=(
                ToolOverride(name="copilot", action="warn"),
            ),
        )
        engine = PolicyEngine(policy)
        result = engine.evaluate(
            _make_result(risk_level="high"),
            tool_name="copilot",
        )
        assert result.action == "warn"

    def test_override_allows_network(self) -> None:
        policy = Policy(
            defaults=PolicyDefaults(allow_network=False),
            file_access=FileAccessPolicy(deny=("x",)),
            tool_overrides=(
                ToolOverride(name="cursor", allow_network=True),
            ),
        )
        engine = PolicyEngine(policy)
        finding = Finding(
            rule_id="NS-001",
            description="Network call",
            severity="danger",
            file_path="test.py",
            line_number=1,
            matched_text="curl",
        )
        result = engine.evaluate(
            _make_result(findings=(finding,)), tool_name="cursor"
        )
        assert not any(v.rule == "network" for v in result.violations)

    def test_unknown_tool_uses_defaults(self, engine: PolicyEngine) -> None:
        result = engine.evaluate(
            _make_result(risk_level="high"),
            tool_name="unknown-tool",
        )
        assert not result.passed
        assert result.action == "block"


class TestCleanPass:
    def test_clean_file_passes(self, engine: PolicyEngine) -> None:
        result = engine.evaluate(_make_result())
        assert result.passed
        assert result.action == "log"
        assert result.violations == ()


class TestPerformance:
    def test_evaluate_under_1ms(self, engine: PolicyEngine) -> None:
        scan_result = _make_result(
            risk_level="high",
            findings=tuple(
                Finding(
                    rule_id=f"SC-{i:03d}",
                    description=f"Finding {i}",
                    severity="danger",
                    file_path="test.py",
                    line_number=i,
                    matched_text="x",
                )
                for i in range(20)
            ),
        )
        start = time.perf_counter_ns()
        for _ in range(100):
            engine.evaluate(scan_result)
        elapsed_ms = (time.perf_counter_ns() - start) / 1_000_000
        avg_ms = elapsed_ms / 100
        assert avg_ms < 1.0, f"Average evaluate time was {avg_ms:.3f}ms"
