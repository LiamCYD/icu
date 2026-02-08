from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

Category = Literal[
    "prompt_injection",
    "data_exfiltration",
    "obfuscation",
    "suspicious_commands",
    "network_suspicious",
]

Severity = Literal["info", "warning", "danger", "critical"]


@dataclass(frozen=True, slots=True)
class DetectionRule:
    rule_id: str
    category: Category
    severity: Severity
    pattern: str
    description: str


DETECTION_RULES: tuple[DetectionRule, ...] = (
    # ── Prompt Injection ──────────────────────────────────────
    DetectionRule(
        rule_id="PI-001",
        category="prompt_injection",
        severity="critical",
        pattern=r"ignore\s+(all\s+)?previous\s+instructions",
        description="Instruction override: ignore previous instructions",
    ),
    DetectionRule(
        rule_id="PI-002",
        category="prompt_injection",
        severity="critical",
        pattern=r"ignore\s+(all\s+)?above\s+instructions",
        description="Instruction override: ignore above instructions",
    ),
    DetectionRule(
        rule_id="PI-003",
        category="prompt_injection",
        severity="critical",
        pattern=r"disregard\s+(all\s+)?prior",
        description="Instruction override: disregard prior instructions",
    ),
    DetectionRule(
        rule_id="PI-004",
        category="prompt_injection",
        severity="danger",
        pattern=r"you\s+are\s+now\s+a",
        description="Role reassignment attempt",
    ),
    DetectionRule(
        rule_id="PI-005",
        category="prompt_injection",
        severity="danger",
        pattern=r"new\s+instructions?\s*:",
        description="New instruction injection",
    ),
    DetectionRule(
        rule_id="PI-006",
        category="prompt_injection",
        severity="danger",
        pattern=r"system\s*:\s*you",
        description="Fake system prompt injection",
    ),
    DetectionRule(
        rule_id="PI-007",
        category="prompt_injection",
        severity="critical",
        pattern=r"<\s*system\s*>",
        description="XML system tag injection",
    ),
    DetectionRule(
        rule_id="PI-008",
        category="prompt_injection",
        severity="critical",
        pattern=r"IMPORTANT:\s*ignore",
        description="Directive to ignore safety rules",
    ),
    # ── Data Exfiltration ─────────────────────────────────────
    DetectionRule(
        rule_id="DE-001",
        category="data_exfiltration",
        severity="critical",
        pattern=r"\.ssh[/\\]",
        description="SSH directory access",
    ),
    DetectionRule(
        rule_id="DE-002",
        category="data_exfiltration",
        severity="critical",
        pattern=r"\.env\b",
        description="Environment file access",
    ),
    DetectionRule(
        rule_id="DE-003",
        category="data_exfiltration",
        severity="critical",
        pattern=r"\.aws[/\\]credentials",
        description="AWS credentials access",
    ),
    DetectionRule(
        rule_id="DE-004",
        category="data_exfiltration",
        severity="danger",
        pattern=r"\.gitconfig",
        description="Git config access",
    ),
    DetectionRule(
        rule_id="DE-005",
        category="data_exfiltration",
        severity="critical",
        pattern=r"id_rsa",
        description="SSH private key access",
    ),
    DetectionRule(
        rule_id="DE-006",
        category="data_exfiltration",
        severity="critical",
        pattern=r"\.gnupg",
        description="GPG keyring access",
    ),
    DetectionRule(
        rule_id="DE-007",
        category="data_exfiltration",
        severity="danger",
        pattern=r"keychain",
        description="Keychain access",
    ),
    DetectionRule(
        rule_id="DE-008",
        category="data_exfiltration",
        severity="danger",
        pattern=r"\.npmrc",
        description="NPM config access (may contain tokens)",
    ),
    DetectionRule(
        rule_id="DE-009",
        category="data_exfiltration",
        severity="danger",
        pattern=r"\.pypirc",
        description="PyPI config access (may contain tokens)",
    ),
    DetectionRule(
        rule_id="DE-010",
        category="data_exfiltration",
        severity="critical",
        pattern=r"curl\s+.*-d\s+.*\$",
        description="Curl POST with variable interpolation (data exfiltration)",
    ),
    DetectionRule(
        rule_id="DE-011",
        category="data_exfiltration",
        severity="critical",
        pattern=r"wget\s+.*--post",
        description="Wget POST request (data exfiltration)",
    ),
    DetectionRule(
        rule_id="DE-012",
        category="data_exfiltration",
        severity="critical",
        pattern=r"nc\s+-[a-z]*\s+\d+",
        description="Netcat connection (potential reverse shell/exfiltration)",
    ),
    # ── Obfuscation ───────────────────────────────────────────
    DetectionRule(
        rule_id="OB-001",
        category="obfuscation",
        severity="warning",
        pattern=r"[A-Za-z0-9+/]{50,}={0,2}",
        description="Possible Base64-encoded payload (long encoded string)",
    ),
    DetectionRule(
        rule_id="OB-002",
        category="obfuscation",
        severity="danger",
        pattern=r"\\x[0-9a-fA-F]{2}(\\x[0-9a-fA-F]{2}){10,}",
        description="Hex-encoded byte sequence",
    ),
    DetectionRule(
        rule_id="OB-003",
        category="obfuscation",
        severity="danger",
        pattern=r"\\u[0-9a-fA-F]{4}(\\u[0-9a-fA-F]{4}){5,}",
        description="Unicode escape sequence chain",
    ),
    DetectionRule(
        rule_id="OB-004",
        category="obfuscation",
        severity="critical",
        pattern=r"[\u200b\u200c\u200d\ufeff]",
        description="Zero-width character detected (potential hidden content)",
    ),
    # ── Suspicious Commands ───────────────────────────────────
    DetectionRule(
        rule_id="SC-001",
        category="suspicious_commands",
        severity="danger",
        pattern=r"subprocess\.(call|run|Popen)",
        description="Subprocess execution",
    ),
    DetectionRule(
        rule_id="SC-002",
        category="suspicious_commands",
        severity="danger",
        pattern=r"os\.system\s*\(",
        description="OS system command execution",
    ),
    DetectionRule(
        rule_id="SC-003",
        category="suspicious_commands",
        severity="danger",
        pattern=r"exec\s*\(",
        description="Dynamic code execution via exec()",
    ),
    DetectionRule(
        rule_id="SC-004",
        category="suspicious_commands",
        severity="danger",
        pattern=r"eval\s*\(",
        description="Dynamic code evaluation via eval()",
    ),
    DetectionRule(
        rule_id="SC-005",
        category="suspicious_commands",
        severity="danger",
        pattern=r"child_process",
        description="Node.js child process spawning",
    ),
    DetectionRule(
        rule_id="SC-006",
        category="suspicious_commands",
        severity="danger",
        pattern=r"Runtime\.getRuntime\(\)\.exec",
        description="Java runtime command execution",
    ),
    # ── Network Suspicious ────────────────────────────────────
    DetectionRule(
        rule_id="NS-001",
        category="network_suspicious",
        severity="warning",
        pattern=r"requests\.(get|post|put)\s*\(",
        description="Python requests library HTTP call",
    ),
    DetectionRule(
        rule_id="NS-002",
        category="network_suspicious",
        severity="warning",
        pattern=r"urllib\.request",
        description="Python urllib network request",
    ),
    DetectionRule(
        rule_id="NS-003",
        category="network_suspicious",
        severity="warning",
        pattern=r"fetch\s*\(",
        description="JavaScript fetch() call",
    ),
    DetectionRule(
        rule_id="NS-004",
        category="network_suspicious",
        severity="warning",
        pattern=r"XMLHttpRequest",
        description="XMLHttpRequest usage",
    ),
    DetectionRule(
        rule_id="NS-005",
        category="network_suspicious",
        severity="warning",
        pattern=r"\.connect\s*\(\s*['\"]",
        description="Socket/database connection to literal address",
    ),
    DetectionRule(
        rule_id="NS-006",
        category="network_suspicious",
        severity="danger",
        pattern=r"dns\.(resolver|query)",
        description="DNS resolution (potential DNS exfiltration)",
    ),
    DetectionRule(
        rule_id="NS-007",
        category="network_suspicious",
        severity="warning",
        pattern=r"socket\.getaddrinfo",
        description="Socket address resolution",
    ),
)


@dataclass(slots=True)
class CompiledRule:
    rule: DetectionRule
    compiled: re.Pattern[str]


class CompiledRuleSet:
    """Pre-compiled set of all detection rules for efficient scanning."""

    def __init__(self, rules: tuple[DetectionRule, ...] = DETECTION_RULES) -> None:
        self._rules: tuple[CompiledRule, ...] = tuple(
            CompiledRule(
                rule=rule,
                compiled=re.compile(rule.pattern, re.IGNORECASE),
            )
            for rule in rules
        )

    @property
    def rules(self) -> tuple[CompiledRule, ...]:
        return self._rules

    def __len__(self) -> int:
        return len(self._rules)

    def __iter__(self):  # type: ignore[no-untyped-def]
        return iter(self._rules)


# Singleton — compiled once at import time
COMPILED_RULES = CompiledRuleSet()
