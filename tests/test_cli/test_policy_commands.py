from __future__ import annotations

import json
from pathlib import Path

import pytest
from click.testing import CliRunner

from icu.cli.main import cli


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner()


@pytest.fixture
def fixtures_dir() -> Path:
    return Path(__file__).parent.parent.parent / "fixtures"


class TestPolicyInit:
    def test_creates_policy_file(
        self, runner: CliRunner, tmp_path: Path
    ) -> None:
        output_path = tmp_path / ".icu-policy.yml"
        result = runner.invoke(cli, ["policy", "init", "-o", str(output_path)])
        assert result.exit_code == 0
        assert output_path.exists()
        content = output_path.read_text()
        assert "defaults:" in content
        assert "file_access:" in content

    def test_refuses_overwrite(
        self, runner: CliRunner, tmp_path: Path
    ) -> None:
        output_path = tmp_path / ".icu-policy.yml"
        output_path.write_text("existing content")
        result = runner.invoke(cli, ["policy", "init", "-o", str(output_path)])
        assert result.exit_code == 1

    def test_force_overwrite(
        self, runner: CliRunner, tmp_path: Path
    ) -> None:
        output_path = tmp_path / ".icu-policy.yml"
        output_path.write_text("old content")
        result = runner.invoke(
            cli, ["policy", "init", "-o", str(output_path), "--force"]
        )
        assert result.exit_code == 0
        content = output_path.read_text()
        assert "defaults:" in content

    def test_help(self, runner: CliRunner) -> None:
        result = runner.invoke(cli, ["policy", "init", "--help"])
        assert result.exit_code == 0
        assert "Generate a default policy file" in result.output


class TestPolicyCheck:
    def test_valid_policy(
        self, runner: CliRunner, tmp_path: Path
    ) -> None:
        policy_file = tmp_path / ".icu-policy.yml"
        policy_file.write_text(
            "version: '1.0'\n"
            "defaults:\n"
            "  action: block\n"
            "  max_risk_level: medium\n"
            "file_access:\n"
            "  deny:\n"
            "    - '~/.ssh/*'\n"
        )
        result = runner.invoke(cli, ["policy", "check", "-p", str(policy_file)])
        assert result.exit_code == 0

    def test_invalid_policy(
        self, runner: CliRunner, tmp_path: Path
    ) -> None:
        policy_file = tmp_path / "bad.yml"
        policy_file.write_text("[invalid yaml {{")
        result = runner.invoke(cli, ["policy", "check", "-p", str(policy_file)])
        assert result.exit_code == 2

    def test_missing_policy(self, runner: CliRunner, tmp_path: Path) -> None:
        result = runner.invoke(
            cli,
            ["policy", "check", "-p", str(tmp_path / "nope.yml")],
        )
        assert result.exit_code == 2

    def test_policy_with_warnings(
        self, runner: CliRunner, tmp_path: Path
    ) -> None:
        policy_file = tmp_path / "warn.yml"
        # Empty deny list triggers a warning
        policy_file.write_text(
            "version: '1.0'\ndefaults:\n  action: block\n"
        )
        result = runner.invoke(cli, ["policy", "check", "-p", str(policy_file)])
        assert result.exit_code == 1

    def test_help(self, runner: CliRunner) -> None:
        result = runner.invoke(cli, ["policy", "check", "--help"])
        assert result.exit_code == 0
        assert "Validate a policy file" in result.output


class TestPolicyTest:
    def test_clean_file_passes(
        self, runner: CliRunner, fixtures_dir: Path, tmp_path: Path
    ) -> None:
        clean_file = fixtures_dir / "clean" / "normal_tool.py"
        if not clean_file.exists():
            pytest.skip("fixture not found")

        policy_file = tmp_path / ".icu-policy.yml"
        policy_file.write_text(
            "defaults:\n"
            "  action: block\n"
            "  max_risk_level: medium\n"
            "file_access:\n"
            "  deny:\n"
            "    - '~/.ssh/*'\n"
        )
        result = runner.invoke(
            cli,
            ["policy", "test", str(clean_file), "-p", str(policy_file)],
        )
        assert result.exit_code == 0

    def test_malicious_file_blocked(
        self, runner: CliRunner, fixtures_dir: Path, tmp_path: Path
    ) -> None:
        mal_file = fixtures_dir / "malicious" / "prompt_injection_skill.md"
        if not mal_file.exists():
            pytest.skip("fixture not found")

        policy_file = tmp_path / ".icu-policy.yml"
        policy_file.write_text(
            "defaults:\n"
            "  action: block\n"
            "  max_risk_level: medium\n"
            "file_access:\n"
            "  deny:\n"
            "    - '~/.ssh/*'\n"
        )
        result = runner.invoke(
            cli,
            ["policy", "test", str(mal_file), "-p", str(policy_file)],
        )
        # Should exit 2 (block) or 1 (warn)
        assert result.exit_code in (1, 2)

    def test_json_output(
        self, runner: CliRunner, fixtures_dir: Path, tmp_path: Path
    ) -> None:
        clean_file = fixtures_dir / "clean" / "normal_tool.py"
        if not clean_file.exists():
            pytest.skip("fixture not found")

        policy_file = tmp_path / ".icu-policy.yml"
        policy_file.write_text(
            "defaults:\n"
            "  action: block\n"
            "  max_risk_level: medium\n"
            "file_access:\n"
            "  deny:\n"
            "    - '~/.ssh/*'\n"
        )
        result = runner.invoke(
            cli,
            [
                "policy", "test", str(clean_file),
                "-p", str(policy_file),
                "--format", "json",
            ],
        )
        assert result.exit_code == 0
        parsed = json.loads(result.output)
        assert isinstance(parsed, list)
        assert len(parsed) > 0
        assert "scan" in parsed[0]
        assert "policy" in parsed[0]

    def test_with_tool_name(
        self, runner: CliRunner, fixtures_dir: Path, tmp_path: Path
    ) -> None:
        clean_file = fixtures_dir / "clean" / "normal_tool.py"
        if not clean_file.exists():
            pytest.skip("fixture not found")

        policy_file = tmp_path / ".icu-policy.yml"
        policy_file.write_text(
            "defaults:\n"
            "  action: block\n"
            "  max_risk_level: medium\n"
            "file_access:\n"
            "  deny:\n"
            "    - '~/.ssh/*'\n"
            "tool_overrides:\n"
            "  - name: cursor\n"
            "    max_risk_level: critical\n"
        )
        result = runner.invoke(
            cli,
            [
                "policy", "test", str(clean_file),
                "-p", str(policy_file),
                "-t", "cursor",
            ],
        )
        assert result.exit_code == 0

    def test_help(self, runner: CliRunner) -> None:
        result = runner.invoke(cli, ["policy", "test", "--help"])
        assert result.exit_code == 0
        assert "Scan a target and evaluate against policy" in result.output

    def test_directory_scan_json(
        self, runner: CliRunner, fixtures_dir: Path, tmp_path: Path
    ) -> None:
        mal_dir = fixtures_dir / "malicious"
        if not mal_dir.exists():
            pytest.skip("fixture not found")

        policy_file = tmp_path / ".icu-policy.yml"
        policy_file.write_text(
            "defaults:\n"
            "  action: block\n"
            "  max_risk_level: medium\n"
            "file_access:\n"
            "  deny:\n"
            "    - '~/.ssh/*'\n"
        )
        result = runner.invoke(
            cli,
            [
                "policy", "test", str(mal_dir),
                "-p", str(policy_file),
                "--format", "json",
            ],
        )
        parsed = json.loads(result.output)
        assert isinstance(parsed, list)
        assert len(parsed) > 1


class TestPolicyTestNoDb:
    def test_policy_test_no_db_still_works(
        self, runner: CliRunner, fixtures_dir: Path, tmp_path: Path
    ) -> None:
        """policy test with DB failure still runs (warning, not crash)."""
        from unittest.mock import patch

        clean_file = fixtures_dir / "clean" / "normal_tool.py"
        if not clean_file.exists():
            pytest.skip("fixture not found")

        policy_file = tmp_path / ".icu-policy.yml"
        policy_file.write_text(
            "defaults:\n"
            "  action: block\n"
            "  max_risk_level: medium\n"
            "file_access:\n"
            "  deny:\n"
            "    - '~/.ssh/*'\n"
        )
        with patch(
            "icu.reputation.database.ReputationDB",
            side_effect=RuntimeError("db error"),
        ):
            result = runner.invoke(
                cli,
                [
                    "policy", "test", str(clean_file),
                    "-p", str(policy_file),
                ],
            )
        assert result.exit_code == 0


class TestPolicyGroupHelp:
    def test_policy_help(self, runner: CliRunner) -> None:
        result = runner.invoke(cli, ["policy", "--help"])
        assert result.exit_code == 0
        assert "init" in result.output
        assert "check" in result.output
        assert "test" in result.output
