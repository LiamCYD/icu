from __future__ import annotations

import os

from icu.analyzer.models import Finding
from icu.analyzer.patterns import COMPILED_RULES, CompiledRuleSet

# Extensions considered "code" — code_only rules fire only on these
_CODE_EXTENSIONS = frozenset({
    ".py", ".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs",
    ".rb", ".go", ".rs", ".java", ".kt", ".cs", ".php",
    ".sh", ".bash", ".zsh", ".ps1", ".bat", ".cmd",
    ".c", ".cpp", ".h", ".hpp", ".swift", ".m",
    ".lua", ".pl", ".pm", ".r", ".scala", ".ex", ".exs",
    ".vue", ".svelte",
})

# Filenames that are never "code" even if extension matches
_NON_CODE_FILENAMES = frozenset({
    ".gitignore", ".dockerignore", ".npmignore", ".eslintignore",
    "license", "licence", "license.md", "licence.md",
    "changelog", "changelog.md", "changes.md",
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "tsconfig.json", "jsconfig.json", "pyproject.toml", "setup.cfg",
    "cargo.toml", "cargo.lock", "go.sum", "go.mod",
    "gemfile.lock", "composer.lock", "requirements.txt",
    "pipfile.lock", ".env.example", ".env.sample",
    "makefile", "dockerfile", "docker-compose.yml", "docker-compose.yaml",
})


def _is_code_file(file_path: str) -> bool:
    """Return True if the file is likely executable code (not docs/config/metadata)."""
    basename = os.path.basename(file_path).lower()
    if basename in _NON_CODE_FILENAMES:
        return False
    _, ext = os.path.splitext(basename)
    if not ext:
        return False
    if ext in {".md", ".rst", ".txt", ".csv", ".json", ".yaml", ".yml",
               ".toml", ".ini", ".cfg", ".xml", ".html", ".css", ".lock",
               ".log", ".svg"}:
        return False
    return ext in _CODE_EXTENSIONS


class HeuristicScanner:
    """Fast single-pass heuristic scanner.

    Iterates each line once, checking all compiled patterns per line.
    """

    def __init__(self, rules: CompiledRuleSet | None = None) -> None:
        self._rules = rules or COMPILED_RULES

    def scan(self, content: str, file_path: str) -> list[Finding]:
        findings: list[Finding] = []
        lines = content.splitlines()
        is_code = _is_code_file(file_path)

        for line_idx, line in enumerate(lines, start=1):
            for compiled_rule in self._rules:
                if compiled_rule.rule.code_only and not is_code:
                    continue
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
