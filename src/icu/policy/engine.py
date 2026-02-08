from __future__ import annotations

import os
from datetime import UTC, datetime
from fnmatch import fnmatch
from typing import TYPE_CHECKING

from icu.analyzer.models import RISK_LEVEL_ORDER
from icu.policy.models import (
    Policy,
    PolicyResult,
    PolicyViolation,
)
from icu.utils.logging import get_logger

if TYPE_CHECKING:
    from icu.analyzer.models import ScanResult

_log = get_logger("policy.engine")

# Rule-ID prefixes that correspond to network / shell categories
_NETWORK_PREFIXES = ("NS-", "DE-010", "DE-011", "DE-012")
_SHELL_PREFIXES = ("SC-",)


class PolicyEngine:
    """Evaluate a scan result against a policy."""

    def __init__(self, policy: Policy) -> None:
        self._policy = policy
        # Pre-expand tilde in file-access patterns once
        self._deny_patterns = tuple(
            os.path.expanduser(p) for p in policy.file_access.deny
        )
        self._allow_patterns = tuple(
            os.path.expanduser(p) for p in policy.file_access.allow
        )
        # Pre-expand network deny/allow patterns
        self._net_deny_patterns = tuple(
            os.path.expanduser(p) for p in policy.network.deny
        )
        self._net_allow_patterns = tuple(
            os.path.expanduser(p) for p in policy.network.allow
        )

    @property
    def policy(self) -> Policy:
        return self._policy

    @property
    def should_deep_scan(self) -> bool:
        return self._policy.defaults.deep_scan

    def evaluate(
        self,
        scan_result: ScanResult,
        tool_name: str | None = None,
    ) -> PolicyResult:
        violations: list[PolicyViolation] = []

        # Resolve effective settings (tool override or defaults)
        defaults = self._policy.defaults
        effective_action = defaults.action
        effective_allow_network = defaults.allow_network
        effective_allow_shell = defaults.allow_shell
        effective_max_risk = defaults.max_risk_level

        if tool_name is not None:
            for override in self._policy.tool_overrides:
                if override.name == tool_name:
                    if override.action is not None:
                        effective_action = override.action
                    if override.allow_network is not None:
                        effective_allow_network = override.allow_network
                    if override.allow_shell is not None:
                        effective_allow_shell = override.allow_shell
                    if override.max_risk_level is not None:
                        effective_max_risk = override.max_risk_level
                    break

        # 1. Risk level check
        result_risk = RISK_LEVEL_ORDER.get(scan_result.risk_level, 0)
        max_risk = RISK_LEVEL_ORDER.get(effective_max_risk, 2)
        if result_risk > max_risk:
            violations.append(
                PolicyViolation(
                    rule="risk_level",
                    description=(
                        f"Risk level '{scan_result.risk_level}' exceeds "
                        f"maximum '{effective_max_risk}'"
                    ),
                    severity=scan_result.risk_level,
                )
            )

        # 2. File access check
        file_path = scan_result.file_path
        expanded_path = os.path.expanduser(file_path)
        if self._matches_deny(expanded_path) and not self._matches_allow(
            expanded_path
        ):
            violations.append(
                PolicyViolation(
                    rule="file_access",
                    description=(
                        f"File '{file_path}' matches a denied path pattern"
                    ),
                    severity="critical",
                )
            )

        # 3. Network findings check
        for finding in scan_result.findings:
            if not any(
                finding.rule_id.startswith(p) for p in _NETWORK_PREFIXES
            ):
                continue

            matched = finding.matched_text or ""

            # Deny always overrides — even when allow_network is True
            if self._matches_net_deny(matched):
                violations.append(
                    PolicyViolation(
                        rule="network_deny",
                        description=(
                            f"Network host '{matched}' matches a denied "
                            f"pattern [{finding.rule_id}]"
                        ),
                        severity=finding.severity,
                    )
                )
                continue

            # If network is allowed, skip further checks
            if effective_allow_network:
                continue

            # If host matches an allow pattern, exempt it
            if self._matches_net_allow(matched):
                continue

            # Otherwise, block the network finding
            violations.append(
                PolicyViolation(
                    rule="network",
                    description=(
                        f"Network-related finding [{finding.rule_id}]: "
                        f"{finding.description}"
                    ),
                    severity=finding.severity,
                )
            )

        # 4. Shell findings check
        if not effective_allow_shell:
            for finding in scan_result.findings:
                if any(
                    finding.rule_id.startswith(p) for p in _SHELL_PREFIXES
                ):
                    violations.append(
                        PolicyViolation(
                            rule="shell",
                            description=(
                                f"Shell-related finding [{finding.rule_id}]: "
                                f"{finding.description}"
                            ),
                            severity=finding.severity,
                        )
                    )

        # 5. Resolve final action
        if violations:
            action = effective_action
        else:
            action = "log"

        return PolicyResult(
            action=action,
            violations=tuple(violations),
        )

    def log_violations(
        self,
        scan_results: list[ScanResult],
        policy_results: list[PolicyResult],
    ) -> None:
        """Append violations to the configured log file, if any."""
        log_file = self._policy.alerts.log_file
        if log_file is None:
            return

        lines: list[str] = []
        ts = datetime.now(UTC).isoformat()
        for scan_result, policy_result in zip(scan_results, policy_results):
            if policy_result.passed:
                continue
            for v in policy_result.violations:
                lines.append(
                    f"{ts} [{v.severity}] {scan_result.file_path}: "
                    f"{v.rule} - {v.description}\n"
                )

        if not lines:
            return

        try:
            with open(log_file, "a", encoding="utf-8") as fh:
                fh.writelines(lines)
        except OSError as exc:
            _log.warning("Cannot write to log file %s: %s", log_file, exc)

    def _matches_deny(self, path: str) -> bool:
        return any(fnmatch(path, p) for p in self._deny_patterns)

    def _matches_allow(self, path: str) -> bool:
        return any(fnmatch(path, p) for p in self._allow_patterns)

    def _matches_net_deny(self, host: str) -> bool:
        return any(fnmatch(host, p) for p in self._net_deny_patterns)

    def _matches_net_allow(self, host: str) -> bool:
        return any(fnmatch(host, p) for p in self._net_allow_patterns)
