"""CLI tests for icu lookup and icu reputation commands."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from click.testing import CliRunner

from icu.cli.main import cli
from icu.reputation.database import ReputationDB
from icu.reputation.models import ThreatSignature

_FIXTURES_DIR = Path(__file__).parent.parent.parent / "fixtures"


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner()


@pytest.fixture
def db_path(tmp_path: Path) -> str:
    return str(tmp_path / "test_reputation.db")


@pytest.fixture
def populated_db(db_path: str) -> str:
    """Create a DB with some threat sigs and return the path."""
    db = ReputationDB(db_path=db_path)
    db.add_threat_signature(
        ThreatSignature(
            name="Test Sig 1",
            category="prompt_injection",
            pattern=r"test_pattern_one",
            severity="critical",
            description="First test sig",
            source="test",
        )
    )
    db.add_threat_signature(
        ThreatSignature(
            name="Test Sig 2",
            category="data_exfiltration",
            pattern=r"test_pattern_two",
            severity="warning",
            description="Second test sig",
            source="test",
        )
    )
    db.close()
    return db_path


class TestLookup:
    def test_lookup_by_hash_not_found(
        self, runner: CliRunner, db_path: str
    ) -> None:
        sha = "a" * 64
        result = runner.invoke(cli, ["lookup", sha, "--db-path", db_path])
        assert result.exit_code == 0
        assert "No signature found" in result.output
        assert "No scan history" in result.output

    def test_lookup_by_file(
        self, runner: CliRunner, db_path: str
    ) -> None:
        clean_file = str(_FIXTURES_DIR / "clean" / "normal_tool.py")
        result = runner.invoke(
            cli, ["lookup", clean_file, "--db-path", db_path]
        )
        assert result.exit_code == 0

    def test_lookup_json_format(
        self, runner: CliRunner, db_path: str
    ) -> None:
        sha = "a" * 64
        result = runner.invoke(
            cli,
            ["lookup", sha, "--format", "json", "--db-path", db_path],
        )
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["sha256"] == sha
        assert data["signature"] is None
        assert data["scan_history"] == []

    def test_lookup_nonexistent_file(
        self, runner: CliRunner, db_path: str
    ) -> None:
        result = runner.invoke(
            cli, ["lookup", "/nonexistent/file.txt", "--db-path", db_path]
        )
        assert result.exit_code == 2

    def test_lookup_help(self, runner: CliRunner) -> None:
        result = runner.invoke(cli, ["lookup", "--help"])
        assert result.exit_code == 0
        assert "Look up" in result.output


class TestReputationList:
    def test_empty_db(self, runner: CliRunner, db_path: str) -> None:
        result = runner.invoke(
            cli, ["reputation", "list", "--db-path", db_path]
        )
        assert result.exit_code == 0
        assert "No threat signatures" in result.output

    def test_with_sigs(
        self, runner: CliRunner, populated_db: str
    ) -> None:
        result = runner.invoke(
            cli, ["reputation", "list", "--db-path", populated_db]
        )
        assert result.exit_code == 0
        assert "2 threat signature(s) found" in result.output

    def test_with_sigs_json(
        self, runner: CliRunner, populated_db: str
    ) -> None:
        result = runner.invoke(
            cli,
            ["reputation", "list", "--format", "json", "--db-path", populated_db],
        )
        assert result.exit_code == 0
        data = json.loads(result.output)
        names = [s["name"] for s in data]
        assert "Test Sig 1" in names
        assert "Test Sig 2" in names

    def test_category_filter(
        self, runner: CliRunner, populated_db: str
    ) -> None:
        result = runner.invoke(
            cli,
            [
                "reputation", "list",
                "--category", "prompt_injection",
                "--db-path", populated_db,
            ],
        )
        assert result.exit_code == 0
        assert "1 threat signature(s) found" in result.output

    def test_json_format_categories(
        self, runner: CliRunner, populated_db: str
    ) -> None:
        result = runner.invoke(
            cli,
            [
                "reputation", "list",
                "--format", "json",
                "--category", "data_exfiltration",
                "--db-path", populated_db,
            ],
        )
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert len(data) == 1
        assert data[0]["name"] == "Test Sig 2"


class TestReputationAdd:
    def test_valid_add(self, runner: CliRunner, db_path: str) -> None:
        result = runner.invoke(
            cli,
            [
                "reputation", "add",
                "--name", "New Sig",
                "--category", "test",
                "--pattern", r"foo.*bar",
                "--severity", "warning",
                "--db-path", db_path,
            ],
        )
        assert result.exit_code == 0
        assert "Added" in result.output

    def test_invalid_regex(self, runner: CliRunner, db_path: str) -> None:
        result = runner.invoke(
            cli,
            [
                "reputation", "add",
                "--name", "Bad",
                "--category", "test",
                "--pattern", "[invalid",
                "--severity", "warning",
                "--db-path", db_path,
            ],
        )
        assert result.exit_code == 2
        assert "Invalid regex" in result.output

    def test_missing_required(self, runner: CliRunner, db_path: str) -> None:
        result = runner.invoke(
            cli,
            ["reputation", "add", "--name", "Only Name", "--db-path", db_path],
        )
        assert result.exit_code != 0


class TestReputationRemove:
    def test_remove_existing(
        self, runner: CliRunner, populated_db: str
    ) -> None:
        result = runner.invoke(
            cli, ["reputation", "remove", "1", "--db-path", populated_db]
        )
        assert result.exit_code == 0
        assert "Removed" in result.output

    def test_remove_nonexistent(
        self, runner: CliRunner, db_path: str
    ) -> None:
        result = runner.invoke(
            cli, ["reputation", "remove", "999", "--db-path", db_path]
        )
        assert result.exit_code == 1
        assert "No threat signature" in result.output


class TestReputationImport:
    def test_valid_yaml(
        self, runner: CliRunner, tmp_path: Path, db_path: str
    ) -> None:
        yaml_file = tmp_path / "import.yml"
        yaml_file.write_text(
            """signatures:
  - name: Imported Sig
    category: test
    pattern: "imported_pattern"
    severity: warning
    description: An imported sig
"""
        )
        result = runner.invoke(
            cli,
            ["reputation", "import", str(yaml_file), "--db-path", db_path],
        )
        assert result.exit_code == 0
        assert "Imported 1" in result.output

    def test_empty_yaml(
        self, runner: CliRunner, tmp_path: Path, db_path: str
    ) -> None:
        yaml_file = tmp_path / "empty.yml"
        yaml_file.write_text("---\n")
        result = runner.invoke(
            cli,
            ["reputation", "import", str(yaml_file), "--db-path", db_path],
        )
        assert result.exit_code == 0
        assert "No signatures found" in result.output


class TestReputationExport:
    def test_export_yaml(
        self, runner: CliRunner, populated_db: str
    ) -> None:
        result = runner.invoke(
            cli,
            ["reputation", "export", "--format", "yaml", "--db-path", populated_db],
        )
        assert result.exit_code == 0
        assert "Test Sig 1" in result.output
        assert "signatures:" in result.output

    def test_export_json(
        self, runner: CliRunner, populated_db: str
    ) -> None:
        result = runner.invoke(
            cli,
            ["reputation", "export", "--format", "json", "--db-path", populated_db],
        )
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "signatures" in data
        assert len(data["signatures"]) == 2

    def test_export_empty_db(
        self, runner: CliRunner, db_path: str
    ) -> None:
        result = runner.invoke(
            cli,
            ["reputation", "export", "--format", "json", "--db-path", db_path],
        )
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["signatures"] == []


class TestReputationGroupHelp:
    def test_help_shows_subcommands(self, runner: CliRunner) -> None:
        result = runner.invoke(cli, ["reputation", "--help"])
        assert result.exit_code == 0
        assert "list" in result.output
        assert "add" in result.output
        assert "remove" in result.output
        assert "import" in result.output
        assert "export" in result.output


class TestScanNoDb:
    def test_scan_with_no_db_flag(self, runner: CliRunner) -> None:
        clean_file = str(_FIXTURES_DIR / "clean" / "normal_tool.py")
        result = runner.invoke(cli, ["scan", clean_file, "--no-db"])
        assert result.exit_code == 0

    def test_policy_test_with_no_db_flag(
        self, runner: CliRunner, tmp_path: Path
    ) -> None:
        clean_file = str(_FIXTURES_DIR / "clean" / "normal_tool.py")
        result = runner.invoke(
            cli, ["policy", "test", clean_file, "--no-db"]
        )
        assert result.exit_code == 0
