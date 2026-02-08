from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Literal

Action = Literal["block", "warn", "log"]
RiskLevel = Literal["clean", "low", "medium", "high", "critical"]


@dataclass(frozen=True, slots=True)
class PolicyDefaults:
    action: Action = "block"
    allow_network: bool = False
    allow_shell: bool = False
    max_risk_level: RiskLevel = "medium"
    deep_scan: bool = True


@dataclass(frozen=True, slots=True)
class FileAccessPolicy:
    deny: tuple[str, ...] = ()
    allow: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class NetworkPolicy:
    allow: tuple[str, ...] = ()
    deny: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class AlertsConfig:
    console: bool = True
    log_file: str | None = None


@dataclass(frozen=True, slots=True)
class ToolOverride:
    name: str
    action: Action | None = None
    allow_network: bool | None = None
    allow_shell: bool | None = None
    max_risk_level: RiskLevel | None = None


@dataclass(frozen=True, slots=True)
class Policy:
    defaults: PolicyDefaults = field(default_factory=PolicyDefaults)
    file_access: FileAccessPolicy = field(default_factory=FileAccessPolicy)
    network: NetworkPolicy = field(default_factory=NetworkPolicy)
    alerts: AlertsConfig = field(default_factory=AlertsConfig)
    tool_overrides: tuple[ToolOverride, ...] = ()

    def to_dict(self) -> dict[str, object]:
        return {
            "defaults": {
                "action": self.defaults.action,
                "allow_network": self.defaults.allow_network,
                "allow_shell": self.defaults.allow_shell,
                "max_risk_level": self.defaults.max_risk_level,
                "deep_scan": self.defaults.deep_scan,
            },
            "file_access": {
                "deny": list(self.file_access.deny),
                "allow": list(self.file_access.allow),
            },
            "network": {
                "allow": list(self.network.allow),
                "deny": list(self.network.deny),
            },
            "alerts": {
                "console": self.alerts.console,
                "log_file": self.alerts.log_file,
            },
            "tool_overrides": [
                {
                    "name": o.name,
                    **({"action": o.action} if o.action is not None else {}),
                    **(
                        {"allow_network": o.allow_network}
                        if o.allow_network is not None
                        else {}
                    ),
                    **(
                        {"allow_shell": o.allow_shell}
                        if o.allow_shell is not None
                        else {}
                    ),
                    **(
                        {"max_risk_level": o.max_risk_level}
                        if o.max_risk_level is not None
                        else {}
                    ),
                }
                for o in self.tool_overrides
            ],
        }


@dataclass(frozen=True, slots=True)
class PolicyViolation:
    rule: str
    description: str
    severity: str


@dataclass(frozen=True, slots=True)
class PolicyResult:
    action: Action
    violations: tuple[PolicyViolation, ...] = ()

    @property
    def passed(self) -> bool:
        return self.action == "log"

    def to_dict(self) -> dict[str, object]:
        return {
            "action": self.action,
            "passed": self.passed,
            "violations": [
                {
                    "rule": v.rule,
                    "description": v.description,
                    "severity": v.severity,
                }
                for v in self.violations
            ],
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)
