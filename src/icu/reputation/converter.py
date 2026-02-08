"""Convert ThreatSignature models into DetectionRules for the scanner."""

from __future__ import annotations

import re
from typing import cast

from icu.analyzer.patterns import DetectionRule, Severity
from icu.reputation.models import ThreatSignature
from icu.utils.logging import get_logger

_log = get_logger("reputation.converter")


def threat_sig_to_rule(sig: ThreatSignature) -> DetectionRule | None:
    """Convert a single ThreatSignature to a DetectionRule.

    Returns None if the pattern is not a valid regex.
    """
    try:
        re.compile(sig.pattern, re.IGNORECASE)
    except re.error as exc:
        _log.warning(
            "Invalid regex in threat signature %s (%s): %s",
            sig.id,
            sig.name,
            exc,
        )
        return None

    rule_id = f"TS-{sig.id:03d}" if sig.id is not None else "TS-000"
    description = sig.description
    if not description.startswith("[dynamic]"):
        description = f"[dynamic] {description}"

    valid = {"info", "warning", "danger", "critical"}
    severity = sig.severity if sig.severity in valid else "warning"

    return DetectionRule(
        rule_id=rule_id,
        category=sig.category,
        severity=cast(Severity, severity),
        pattern=sig.pattern,
        description=description,
    )


def threat_sigs_to_rules(
    sigs: list[ThreatSignature],
) -> tuple[DetectionRule, ...]:
    """Batch convert ThreatSignatures, filtering out invalid ones."""
    rules: list[DetectionRule] = []
    for sig in sigs:
        rule = threat_sig_to_rule(sig)
        if rule is not None:
            rules.append(rule)
    return tuple(rules)
