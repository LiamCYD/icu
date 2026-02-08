from __future__ import annotations

import math
import re
from collections import Counter

from icu.analyzer.models import Finding

_QUOTED_STRING_RE = re.compile(
    r"""(?:\"\"\"[\s\S]*?\"\"\"|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')"""
)
_LONG_TOKEN_RE = re.compile(r"[A-Za-z0-9+/=_\-]{20,}")

DEFAULT_ENTROPY_THRESHOLD = 4.5
DEFAULT_MIN_LENGTH = 20


def calculate_entropy(s: str) -> float:
    """Calculate Shannon entropy of a string in bits per character."""
    if not s:
        return 0.0
    counts = Counter(s)
    length = len(s)
    entropy = 0.0
    for count in counts.values():
        if count == 0:
            continue
        p = count / length
        entropy -= p * math.log2(p)
    return entropy


def extract_string_literals(content: str) -> list[tuple[int, str]]:
    """Extract quoted strings and long unbroken tokens with their line numbers."""
    results: list[tuple[int, str]] = []
    seen_positions: set[int] = set()

    for match in _QUOTED_STRING_RE.finditer(content):
        text = match.group()
        # Strip outer quotes
        if text.startswith(('"""', "'''")):
            text = text[3:-3]
        else:
            text = text[1:-1]
        if len(text) >= DEFAULT_MIN_LENGTH:
            line_num = content.count("\n", 0, match.start()) + 1
            results.append((line_num, text))
            seen_positions.add(match.start())

    for match in _LONG_TOKEN_RE.finditer(content):
        if match.start() not in seen_positions:
            text = match.group()
            if len(text) >= DEFAULT_MIN_LENGTH:
                line_num = content.count("\n", 0, match.start()) + 1
                results.append((line_num, text))

    return results


def scan_entropy(
    content: str,
    file_path: str = "<unknown>",
    threshold: float = DEFAULT_ENTROPY_THRESHOLD,
) -> list[Finding]:
    """Scan content for high-entropy strings that may be encoded payloads."""
    findings: list[Finding] = []
    strings = extract_string_literals(content)

    for line_num, s in strings:
        ent = calculate_entropy(s)
        if ent > threshold:
            display = s if len(s) <= 200 else s[:200] + "..."
            findings.append(
                Finding(
                    rule_id="EN-001",
                    description=(
                        f"High-entropy string ({ent:.1f} bits/char)"
                        " — possible encoded payload"
                    ),
                    severity="warning",
                    file_path=file_path,
                    line_number=line_num,
                    matched_text=display,
                )
            )

    return findings
