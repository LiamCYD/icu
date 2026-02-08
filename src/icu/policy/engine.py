from __future__ import annotations

import os
from fnmatch import fnmatch
from typing import TYPE_CHECKING

from icu.analyzer.models import RISK_LEVEL_ORDER
from icu.policy.models import (
    Policy,
    PolicyResult,
    PolicyViolation,
)

if TYPE_CHECKING:
    from icu.analyzer.models import ScanResult

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

    @property
    def policy(self) -> Policy:
        return self._policy

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
        if not effective_allow_network:
            for finding in scan_result.findings:
                if any(
                    finding.rule_id.startswith(p) for p in _NETWORK_PREFIXES
                ):
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

    def _matches_deny(self, path: str) -> bool:
        return any(fnmatch(path, p) for p in self._deny_patterns)

    def _matches_allow(self, path: str) -> bool:
        return any(fnmatch(path, p) for p in self._allow_patterns)
