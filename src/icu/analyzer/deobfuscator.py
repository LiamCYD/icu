from __future__ import annotations

import base64
import re
from dataclasses import dataclass

from icu.analyzer.models import Finding

_BASE64_RE = re.compile(r"[A-Za-z0-9+/]{20,}={0,2}")
_HEX_RE = re.compile(r"(?:\\x[0-9a-fA-F]{2}){4,}")
_UNICODE_RE = re.compile(r"(?:\\u[0-9a-fA-F]{4}){3,}")
_ZERO_WIDTH_RE = re.compile(r"[\u200b\u200c\u200d\ufeff]+")


@dataclass(frozen=True, slots=True)
class DeobfuscationResult:
    encoding: str
    original: str
    decoded: str
    line_number: int


def detect_base64(content: str) -> list[DeobfuscationResult]:
    results: list[DeobfuscationResult] = []
    for match in _BASE64_RE.finditer(content):
        candidate = match.group()
        try:
            decoded_bytes = base64.b64decode(candidate, validate=True)
            decoded = decoded_bytes.decode("utf-8", errors="replace")
            # Filter out likely false positives (non-printable garbage)
            printable = sum(
                1 for c in decoded if c.isprintable() or c.isspace()
            )
            printable_ratio = printable / max(len(decoded), 1)
            if printable_ratio > 0.7:
                line_num = content.count("\n", 0, match.start()) + 1
                results.append(
                    DeobfuscationResult(
                        encoding="base64",
                        original=candidate[:200],
                        decoded=decoded[:500],
                        line_number=line_num,
                    )
                )
        except Exception:
            continue
    return results


def detect_hex_encoding(content: str) -> list[DeobfuscationResult]:
    results: list[DeobfuscationResult] = []
    for match in _HEX_RE.finditer(content):
        raw = match.group()
        try:
            hex_values = re.findall(r"\\x([0-9a-fA-F]{2})", raw)
            decoded_bytes = bytes(int(h, 16) for h in hex_values)
            decoded = decoded_bytes.decode("utf-8", errors="replace")
            line_num = content.count("\n", 0, match.start()) + 1
            results.append(
                DeobfuscationResult(
                    encoding="hex",
                    original=raw[:200],
                    decoded=decoded[:500],
                    line_number=line_num,
                )
            )
        except Exception:
            continue
    return results


def detect_unicode_escapes(content: str) -> list[DeobfuscationResult]:
    results: list[DeobfuscationResult] = []
    for match in _UNICODE_RE.finditer(content):
        raw = match.group()
        try:
            decoded = raw.encode("utf-8").decode("unicode_escape")
            line_num = content.count("\n", 0, match.start()) + 1
            results.append(
                DeobfuscationResult(
                    encoding="unicode_escape",
                    original=raw[:200],
                    decoded=decoded[:500],
                    line_number=line_num,
                )
            )
        except Exception:
            continue
    return results


def detect_zero_width(content: str) -> list[DeobfuscationResult]:
    results: list[DeobfuscationResult] = []
    for match in _ZERO_WIDTH_RE.finditer(content):
        raw = match.group()
        if len(raw) < 2:
            continue
        # Map zero-width chars to binary representation
        char_map = {
            "\u200b": "0",
            "\u200c": "1",
            "\u200d": "",
            "\ufeff": "",
        }
        binary = "".join(char_map.get(c, "") for c in raw)
        decoded = ""
        if binary:
            try:
                chars = [binary[i : i + 8] for i in range(0, len(binary), 8)]
                decoded = "".join(
                    chr(int(b, 2)) for b in chars if len(b) == 8 and int(b, 2) > 0
                )
            except (ValueError, OverflowError):
                decoded = f"[{len(raw)} zero-width chars]"
        else:
            decoded = f"[{len(raw)} zero-width chars]"

        line_num = content.count("\n", 0, match.start()) + 1
        results.append(
            DeobfuscationResult(
                encoding="zero_width",
                original=repr(raw)[:200],
                decoded=decoded[:500] if decoded else f"[{len(raw)} zero-width chars]",
                line_number=line_num,
            )
        )
    return results


def scan_deobfuscation(
    content: str,
    file_path: str = "<unknown>",
) -> list[Finding]:
    """Run all deobfuscation detectors and optionally re-scan decoded content."""
    from icu.analyzer.heuristics import HeuristicScanner

    findings: list[Finding] = []
    scanner = HeuristicScanner()

    decoders = [
        detect_base64,
        detect_hex_encoding,
        detect_unicode_escapes,
        detect_zero_width,
    ]

    for decoder in decoders:
        results = decoder(content)
        for result in results:
            findings.append(
                Finding(
                    rule_id=f"DO-{result.encoding[:3].upper()}",
                    description=(
                        f"Decoded {result.encoding} content: "
                        f"{result.decoded[:100]}"
                    ),
                    severity="danger",
                    file_path=file_path,
                    line_number=result.line_number,
                    matched_text=result.original[:200],
                )
            )
            # Re-scan decoded content for hidden payloads
            hidden = scanner.scan(result.decoded, file_path)
            for h in hidden:
                findings.append(
                    Finding(
                        rule_id=h.rule_id,
                        description=f"[hidden in {result.encoding}] {h.description}",
                        severity="critical",
                        file_path=file_path,
                        line_number=result.line_number,
                        matched_text=h.matched_text,
                        context=(
                            f"Decoded from {result.encoding}: "
                            f"{result.original[:100]}"
                        ),
                    )
                )

    return findings
