from __future__ import annotations

from icu.analyzer.models import Finding
from icu.analyzer.patterns import COMPILED_RULES, CompiledRuleSet


class HeuristicScanner:
    """Fast single-pass heuristic scanner.

    Iterates each line once, checking all compiled patterns per line.
    """

    def __init__(self, rules: CompiledRuleSet | None = None) -> None:
        self._rules = rules or COMPILED_RULES

    def scan(self, content: str, file_path: str) -> list[Finding]:
        findings: list[Finding] = []
        lines = content.splitlines()

        for line_idx, line in enumerate(lines, start=1):
            for compiled_rule in self._rules:
                match = compiled_rule.compiled.search(line)
                if match:
                    matched_text = match.group()
                    if len(matched_text) > 200:
                        matched_text = matched_text[:200] + "..."

                    context = self._get_context(lines, line_idx - 1, window=2)

                    findings.append(
                        Finding(
                            rule_id=compiled_rule.rule.rule_id,
                            description=compiled_rule.rule.description,
                            severity=compiled_rule.rule.severity,
                            file_path=file_path,
                            line_number=line_idx,
                            matched_text=matched_text,
                            context=context,
                        )
                    )

        return findings

    @staticmethod
    def _get_context(lines: list[str], idx: int, window: int = 2) -> str:
        start = max(0, idx - window)
        end = min(len(lines), idx + window + 1)
        context_lines: list[str] = []
        for i in range(start, end):
            prefix = ">>> " if i == idx else "    "
            context_lines.append(f"{prefix}{i + 1}: {lines[i]}")
        return "\n".join(context_lines)
