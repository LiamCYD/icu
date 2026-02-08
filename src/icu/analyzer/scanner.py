from __future__ import annotations

import time
from pathlib import Path
from typing import Literal

from icu.analyzer.deobfuscator import scan_deobfuscation
from icu.analyzer.entropy import scan_entropy
from icu.analyzer.heuristics import HeuristicScanner
from icu.analyzer.models import Finding, ScanResult, aggregate_risk_level
from icu.reputation.database import ReputationDB
from icu.reputation.hasher import hash_file
from icu.utils.cache import HashCache
from icu.utils.logging import get_logger

_log = get_logger("scanner")

ScanDepth = Literal["fast", "deep", "auto"]

_SKIP_EXTENSIONS = frozenset({
    ".pyc", ".pyo", ".so", ".dylib", ".dll", ".exe",
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg",
    ".woff", ".woff2", ".ttf", ".eot",
    ".zip", ".tar", ".gz", ".bz2",
})


class Scanner:
    """Core scan orchestrator implementing the tiered pipeline."""

    def __init__(
        self,
        db: ReputationDB | None = None,
        cache: HashCache | None = None,
    ) -> None:
        self._db = db
        self._cache = cache or HashCache()
        self._heuristic = HeuristicScanner()

    def scan_file(
        self,
        path: str | Path,
        depth: ScanDepth = "auto",
    ) -> ScanResult:
        path = Path(path)
        start = time.perf_counter_ns()

        if not path.is_file():
            return ScanResult(
                file_path=str(path),
                risk_level="clean",
                findings=(),
                scan_time_ms=_elapsed_ms(start),
            )

        if path.suffix.lower() in _SKIP_EXTENSIONS:
            return ScanResult(
                file_path=str(path),
                risk_level="clean",
                findings=(),
                scan_time_ms=_elapsed_ms(start),
            )

        # Stage 1: Hash check
        file_hash = hash_file(path)

        cached = self._cache.get(file_hash)
        if cached is not None and isinstance(cached, ScanResult):
            return ScanResult(
                file_path=str(path),
                risk_level=cached.risk_level,
                findings=cached.findings,
                sha256=file_hash,
                scan_time_ms=_elapsed_ms(start),
                cached=True,
            )

        if self._db is not None:
            if self._db.is_known_good(file_hash):
                result = ScanResult(
                    file_path=str(path),
                    risk_level="clean",
                    findings=(),
                    sha256=file_hash,
                    scan_time_ms=_elapsed_ms(start),
                    cached=True,
                )
                self._cache.put(file_hash, result)
                return result
            if self._db.is_known_bad(file_hash):
                result = ScanResult(
                    file_path=str(path),
                    risk_level="critical",
                    findings=(
                        Finding(
                            rule_id="DB-001",
                            description="File hash matches known malicious signature",
                            severity="critical",
                            file_path=str(path),
                            line_number=0,
                            matched_text=file_hash,
                        ),
                    ),
                    sha256=file_hash,
                    scan_time_ms=_elapsed_ms(start),
                    cached=True,
                )
                self._cache.put(file_hash, result)
                return result

        # Read file content
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            _log.warning("Could not read %s: %s", path, e)
            return ScanResult(
                file_path=str(path),
                risk_level="clean",
                findings=(),
                sha256=file_hash,
                scan_time_ms=_elapsed_ms(start),
            )

        all_findings: list[Finding] = []

        # Stage 2: Fast scan (heuristics)
        heuristic_findings = self._heuristic.scan(content, str(path))
        all_findings.extend(heuristic_findings)

        # Stage 3: Deep scan (entropy + deobfuscation)
        should_deep_scan = (
            depth == "deep"
            or (depth == "auto" and len(heuristic_findings) > 0)
        )

        if should_deep_scan:
            entropy_findings = scan_entropy(content, str(path))
            all_findings.extend(entropy_findings)

            deobfuscation_findings = scan_deobfuscation(content, str(path))
            all_findings.extend(deobfuscation_findings)

        findings_tuple = tuple(all_findings)
        risk = aggregate_risk_level(findings_tuple)

        result = ScanResult(
            file_path=str(path),
            risk_level=risk,
            findings=findings_tuple,
            sha256=file_hash,
            scan_time_ms=_elapsed_ms(start),
        )

        self._cache.put(file_hash, result)

        if self._db is not None:
            try:
                from icu.reputation.models import Signature

                self._db.record_signature(
                    Signature(sha256=file_hash, risk_level=risk)
                )
                self._db.log_scan(
                    sha256=file_hash,
                    scan_type="deep" if should_deep_scan else "fast",
                    result=risk,
                    findings=[f.to_dict() for f in findings_tuple],
                    duration_ms=result.scan_time_ms,
                )
            except Exception as e:
                _log.warning("Failed to log to reputation DB: %s", e)

        return result

    def scan_directory(
        self,
        path: str | Path,
        depth: ScanDepth = "auto",
    ) -> list[ScanResult]:
        path = Path(path)
        results: list[ScanResult] = []

        if not path.is_dir():
            return [self.scan_file(path, depth=depth)]

        for child in sorted(path.rglob("*")):
            if child.is_file() and not _should_skip_path(child):
                results.append(self.scan_file(child, depth=depth))

        return results


def _elapsed_ms(start_ns: int) -> float:
    return (time.perf_counter_ns() - start_ns) / 1_000_000


def _should_skip_path(path: Path) -> bool:
    parts = path.parts
    skip_dirs = {"__pycache__", ".git", "node_modules", ".venv", ".tox"}
    return any(part in skip_dirs for part in parts)
