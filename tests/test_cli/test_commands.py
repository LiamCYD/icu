"""CLI command tests using Click's CliRunner."""

from __future__ import annotations

import json
from pathlib import Path

from click.testing import CliRunner

from icu.cli.main import cli

_FIXTURES_DIR = Path(__file__).parent.parent.parent / "fixtures"


class TestScanCommand:
    def setup_method(self) -> None:
        self.runner = CliRunner()

    def test_scan_clean_file_exit_0(self) -> None:
        result = self.runner.invoke(cli, ["scan", str(_FIXTURES_DIR / "clean" / "normal_tool.py")])
        assert result.exit_code == 0

    def test_scan_malicious_file_exit_nonzero(self) -> None:
        result = self.runner.invoke(
            cli, ["scan", str(_FIXTURES_DIR / "malicious" / "prompt_injection_skill.md")]
        )
        assert result.exit_code in (1, 2)

    def test_scan_directory(self) -> None:
        result = self.runner.invoke(cli, ["scan", str(_FIXTURES_DIR / "clean")])
        assert result.exit_code == 0

    def test_scan_json_format(self) -> None:
        result = self.runner.invoke(
            cli,
            ["scan", str(_FIXTURES_DIR / "clean" / "normal_tool.py"), "--format", "json"],
        )
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "results" in data
        assert "summary" in data
        assert data["summary"]["total_files"] == 1

    def test_scan_json_malicious(self) -> None:
        result = self.runner.invoke(
            cli,
            ["scan", str(_FIXTURES_DIR / "malicious" / "prompt_injection_skill.md"), "--format", "json"],
        )
        data = json.loads(result.output)
        assert data["summary"]["critical"] >= 1

    def test_scan_sarif_format(self) -> None:
        result = self.runner.invoke(
            cli,
            ["scan", str(_FIXTURES_DIR / "malicious" / "prompt_injection_skill.md"), "--format", "sarif"],
        )
        data = json.loads(result.output)
        assert data["version"] == "2.1.0"
        assert len(data["runs"]) == 1
        assert len(data["runs"][0]["results"]) > 0

    def test_scan_depth_fast(self) -> None:
        result = self.runner.invoke(
            cli,
            ["scan", str(_FIXTURES_DIR / "clean" / "normal_tool.py"), "--depth", "fast"],
        )
        assert result.exit_code == 0

    def test_scan_depth_deep(self) -> None:
        result = self.runner.invoke(
            cli,
            ["scan", str(_FIXTURES_DIR / "clean" / "normal_tool.py"), "--depth", "deep"],
        )
        assert result.exit_code == 0

    def test_scan_nonexistent_path(self) -> None:
        result = self.runner.invoke(cli, ["scan", "/nonexistent/path"])
        assert result.exit_code != 0  # Click should error on nonexistent path

    def test_version(self) -> None:
        result = self.runner.invoke(cli, ["--version"])
        assert result.exit_code == 0
        assert "0.1.0" in result.output

    def test_help(self) -> None:
        result = self.runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "I See You" in result.output

    def test_scan_help(self) -> None:
        result = self.runner.invoke(cli, ["scan", "--help"])
        assert result.exit_code == 0
        assert "Scan a file or directory" in result.output
