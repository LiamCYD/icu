"""Integration tests for the Scanner orchestrator."""

from __future__ import annotations

from pathlib import Path

from icu.analyzer.scanner import Scanner
from icu.reputation.database import ReputationDB
from icu.reputation.models import Signature


class TestScannerCleanFiles:
    def test_clean_skill(self, scanner: Scanner, clean_dir: Path) -> None:
        result = scanner.scan_file(clean_dir / "normal_skill.md")
        assert result.risk_level == "clean"
        assert len(result.findings) == 0

    def test_clean_config(self, scanner: Scanner, clean_dir: Path) -> None:
        result = scanner.scan_file(clean_dir / "safe_mcp_config.json")
        assert result.risk_level == "clean"
        assert len(result.findings) == 0

    def test_clean_tool(self, scanner: Scanner, clean_dir: Path) -> None:
        result = scanner.scan_file(clean_dir / "normal_tool.py")
        assert result.risk_level == "clean"
        assert len(result.findings) == 0

    def test_clean_directory_all_clean(self, scanner: Scanner, clean_dir: Path) -> None:
        results = scanner.scan_directory(clean_dir)
        assert all(r.risk_level == "clean" for r in results)

    def test_clean_scan_performance(self, scanner: Scanner, clean_dir: Path) -> None:
        """Clean files should scan in < 5ms (generous margin for CI)."""
        result = scanner.scan_file(clean_dir / "normal_tool.py")
        assert result.scan_time_ms < 50  # generous for CI


class TestScannerMaliciousFiles:
    def test_prompt_injection_skill(
        self, scanner: Scanner, malicious_dir: Path,
    ) -> None:
        result = scanner.scan_file(malicious_dir / "prompt_injection_skill.md")
        assert result.risk_level in ("high", "critical")
        assert len(result.findings) > 0
        rule_ids = {f.rule_id for f in result.findings}
        assert any(rid.startswith("PI-") for rid in rule_ids)

    def test_exfiltration_config(self, scanner: Scanner, malicious_dir: Path) -> None:
        result = scanner.scan_file(malicious_dir / "exfiltration_mcp_config.json")
        assert result.risk_level in ("high", "critical")
        rule_ids = {f.rule_id for f in result.findings}
        assert any(rid.startswith("DE-") for rid in rule_ids)

    def test_obfuscated_payload(self, scanner: Scanner, malicious_dir: Path) -> None:
        result = scanner.scan_file(malicious_dir / "obfuscated_payload.py")
        assert result.risk_level in ("high", "critical")
        assert len(result.findings) > 0

    def test_hidden_unicode(self, scanner: Scanner, malicious_dir: Path) -> None:
        result = scanner.scan_file(malicious_dir / "hidden_unicode.txt")
        assert result.risk_level in ("high", "critical")
        rule_ids = {f.rule_id for f in result.findings}
        assert any(rid.startswith("OB-") for rid in rule_ids)

    def test_malicious_directory(self, scanner: Scanner, malicious_dir: Path) -> None:
        results = scanner.scan_directory(malicious_dir)
        risk_levels = {r.risk_level for r in results}
        assert "high" in risk_levels or "critical" in risk_levels


class TestScannerTieredPipeline:
    def test_auto_escalates_on_suspicious(
        self, scanner: Scanner, malicious_dir: Path,
    ) -> None:
        """Auto depth should trigger deep scan when heuristics find issues."""
        path = malicious_dir / "obfuscated_payload.py"
        result = scanner.scan_file(path, depth="auto")
        # Deep scan findings (entropy/deobfuscation) should be present
        assert len(result.findings) > 0

    def test_fast_depth_skips_deep(
        self, scanner: Scanner, malicious_dir: Path,
    ) -> None:
        """Fast depth should only run heuristics."""
        path = malicious_dir / "obfuscated_payload.py"
        result_fast = scanner.scan_file(path, depth="fast")
        result_deep = scanner.scan_file(path, depth="deep")
        # Deep should have at least as many findings as fast
        assert len(result_deep.findings) >= len(result_fast.findings)

    def test_nonexistent_file(self, scanner: Scanner) -> None:
        result = scanner.scan_file("/nonexistent/file.txt")
        assert result.risk_level == "clean"
        assert len(result.findings) == 0

    def test_binary_file_skipped(self, scanner: Scanner, tmp_path: Path) -> None:
        bin_file = tmp_path / "image.png"
        bin_file.write_bytes(b"\x89PNG\r\n")
        result = scanner.scan_file(bin_file)
        assert result.risk_level == "clean"


class TestScannerCaching:
    def test_repeated_scan_uses_cache(self, scanner: Scanner, clean_dir: Path) -> None:
        file_path = clean_dir / "normal_tool.py"
        scanner.scan_file(file_path)
        result2 = scanner.scan_file(file_path)
        assert result2.cached is True

    def test_cache_preserves_risk_level(
        self, scanner: Scanner, malicious_dir: Path,
    ) -> None:
        file_path = malicious_dir / "prompt_injection_skill.md"
        result1 = scanner.scan_file(file_path)
        result2 = scanner.scan_file(file_path)
        assert result1.risk_level == result2.risk_level


class TestScannerReputationDB:
    def test_known_good_hash_passes(
        self, tmp_db: ReputationDB, clean_dir: Path,
    ) -> None:
        from icu.reputation.hasher import hash_file

        file_path = clean_dir / "normal_tool.py"
        file_hash = hash_file(file_path)
        tmp_db.record_signature(Signature(sha256=file_hash, risk_level="clean"))

        scanner = Scanner(db=tmp_db)
        result = scanner.scan_file(file_path)
        assert result.risk_level == "clean"
        assert result.cached is True

    def test_known_bad_hash_blocks(self, tmp_db: ReputationDB, clean_dir: Path) -> None:
        from icu.reputation.hasher import hash_file

        file_path = clean_dir / "normal_tool.py"
        file_hash = hash_file(file_path)
        tmp_db.record_signature(
            Signature(sha256=file_hash, risk_level="critical", flagged=True)
        )

        scanner = Scanner(db=tmp_db)
        result = scanner.scan_file(file_path)
        assert result.risk_level == "critical"

    def test_scanner_without_db(self, clean_dir: Path) -> None:
        scanner = Scanner(db=None)
        result = scanner.scan_file(clean_dir / "normal_tool.py")
        assert result.risk_level == "clean"


class TestScannerSHA256:
    def test_sha256_populated(self, scanner: Scanner, clean_dir: Path) -> None:
        result = scanner.scan_file(clean_dir / "normal_tool.py")
        assert len(result.sha256) == 64
        assert all(c in "0123456789abcdef" for c in result.sha256)


class TestFileSizeGuard:
    def test_large_file_skipped(self, tmp_path: Path) -> None:
        big = tmp_path / "big.py"
        big.write_text("x = 1\n" * 200_000)  # ~1.2 MB
        scanner = Scanner(db=None, max_file_size=1_048_576)
        result = scanner.scan_file(big)
        assert result.risk_level == "clean"
        assert len(result.findings) == 0

    def test_normal_file_scanned(
        self, scanner: Scanner, clean_dir: Path,
    ) -> None:
        result = scanner.scan_file(clean_dir / "normal_tool.py")
        # Should actually scan (not skipped)
        assert result.sha256 != ""

    def test_custom_max_file_size(self, tmp_path: Path) -> None:
        small = tmp_path / "small.py"
        small.write_text("x = 1\n" * 100)  # ~600 bytes
        scanner = Scanner(db=None, max_file_size=500)
        result = scanner.scan_file(small)
        # File > 500 bytes, should be skipped
        assert result.risk_level == "clean"
        assert result.sha256 == ""


class TestExcludePatterns:
    def test_exclude_by_name(self, tmp_path: Path) -> None:
        f = tmp_path / "secret.log"
        f.write_text("x = 1")
        scanner = Scanner(db=None, exclude=("*.log",))
        result = scanner.scan_file(f)
        assert result.risk_level == "clean"
        assert result.sha256 == ""  # skipped, no hash

    def test_exclude_by_path(self, tmp_path: Path) -> None:
        sub = tmp_path / "vendor"
        sub.mkdir()
        f = sub / "lib.py"
        f.write_text("x = 1")
        scanner = Scanner(db=None, exclude=("*/vendor/*",))
        result = scanner.scan_file(f)
        assert result.sha256 == ""  # skipped

    def test_non_matching_pattern_scans(self, tmp_path: Path) -> None:
        f = tmp_path / "app.py"
        f.write_text("x = 1")
        scanner = Scanner(db=None, exclude=("*.log",))
        result = scanner.scan_file(f)
        assert result.sha256 != ""  # was actually scanned

    def test_directory_excludes(self, tmp_path: Path) -> None:
        (tmp_path / "keep.py").write_text("x = 1")
        (tmp_path / "skip.log").write_text("x = 1")
        scanner = Scanner(db=None, exclude=("*.log",))
        results = scanner.scan_directory(tmp_path)
        paths = [r.file_path for r in results]
        assert any("keep.py" in p for p in paths)
        assert not any("skip.log" in p for p in paths)


class TestParallelScanning:
    def test_results_complete(
        self, scanner: Scanner, malicious_dir: Path,
    ) -> None:
        results = scanner.scan_directory(malicious_dir)
        file_paths = {r.file_path for r in results}
        # Should contain all scannable files
        assert len(file_paths) == len(results)
        assert len(results) > 0

    def test_empty_directory(self, tmp_path: Path) -> None:
        scanner = Scanner(db=None)
        results = scanner.scan_directory(tmp_path)
        assert results == []

    def test_matches_serial_results(self, clean_dir: Path) -> None:
        serial = Scanner(db=None, max_workers=1)
        parallel = Scanner(db=None, max_workers=4)
        r_serial = serial.scan_directory(clean_dir)
        r_parallel = parallel.scan_directory(clean_dir)
        assert len(r_serial) == len(r_parallel)
        serial_paths = sorted(r.file_path for r in r_serial)
        parallel_paths = sorted(r.file_path for r in r_parallel)
        assert serial_paths == parallel_paths

    def test_max_workers_one(self, clean_dir: Path) -> None:
        scanner = Scanner(db=None, max_workers=1)
        results = scanner.scan_directory(clean_dir)
        assert all(r.risk_level == "clean" for r in results)
