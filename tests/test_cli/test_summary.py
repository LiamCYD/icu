"""Tests for scan summary formatting."""

from __future__ import annotations

from io import StringIO

from rich.console import Console

from icu.analyzer.models import Finding, ScanResult
from icu.utils.formatting import format_scan_summary


def _make_result(
    risk: str = "clean", findings: int = 0, cached: bool = False,
) -> ScanResult:
    return ScanResult(
        file_path="test.py",
        risk_level=risk,
        findings=tuple(
            Finding(
                rule_id="T-001",
                description="test",
                severity="warning",
                file_path="test.py",
                line_number=1,
                matched_text="x",
            )
            for _ in range(findings)
        ),
        scan_time_ms=1.0,
        cached=cached,
    )


def _render(panel: object) -> str:
    buf = StringIO()
    console = Console(file=buf, force_terminal=True, width=120)
    console.print(panel)
    return buf.getvalue()


class TestScanSummary:
    def test_mixed_results_counts(self) -> None:
        results = [
            _make_result("clean"),
            _make_result("medium", findings=1),
            _make_result("critical", findings=2),
        ]
        panel = format_scan_summary(results)
        rendered = _render(panel)
        assert "3" in rendered  # total files

    def test_all_clean_green_border(self) -> None:
        results = [_make_result("clean"), _make_result("clean")]
        panel = format_scan_summary(results)
        assert panel.border_style == "green"

    def test_high_risk_red_border(self) -> None:
        results = [
            _make_result("clean"),
            _make_result("high", findings=1),
        ]
        panel = format_scan_summary(results)
        assert panel.border_style == "red"

    def test_cached_count(self) -> None:
        results = [
            _make_result("clean", cached=True),
            _make_result("clean", cached=False),
        ]
        panel = format_scan_summary(results)
        rendered = _render(panel)
        assert "1" in rendered  # 1 cached
