from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Literal

Severity = Literal["info", "warning", "danger", "critical"]
RiskLevel = Literal["clean", "low", "medium", "high", "critical"]


@dataclass(frozen=True, slots=True)
class Finding:
    rule_id: str
    description: str
    severity: Severity
    file_path: str
    line_number: int
    matched_text: str
    context: str = ""

    def to_dict(self) -> dict[str, str | int]:
        return {
            "rule_id": self.rule_id,
            "description": self.description,
            "severity": self.severity,
            "file_path": self.file_path,
            "line_number": self.line_number,
            "matched_text": self.matched_text,
            "context": self.context,
        }


@dataclass(frozen=True, slots=True)
class ScanResult:
    file_path: str
    risk_level: RiskLevel
    findings: tuple[Finding, ...]
    sha256: str = ""
    scan_time_ms: float = 0.0
    cached: bool = False

    def to_dict(self) -> dict[str, object]:
        return {
            "file_path": self.file_path,
            "risk_level": self.risk_level,
            "findings": [f.to_dict() for f in self.findings],
            "sha256": self.sha256,
            "scan_time_ms": round(self.scan_time_ms, 3),
            "cached": self.cached,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


SEVERITY_ORDER: dict[Severity, int] = {
    "info": 0,
    "warning": 1,
    "danger": 2,
    "critical": 3,
}

RISK_LEVEL_ORDER: dict[RiskLevel, int] = {
    "clean": 0,
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


def aggregate_risk_level(findings: tuple[Finding, ...] | list[Finding]) -> RiskLevel:
    if not findings:
        return "clean"
    max_severity = max(SEVERITY_ORDER[f.severity] for f in findings)
    if max_severity == 0:
        return "low"
    if max_severity == 1:
        return "medium"
    if max_severity == 2:
        return "high"
    return "critical"
