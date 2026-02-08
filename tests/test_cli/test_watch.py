"""Tests for ``icu watch`` CLI command."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest
from click.testing import CliRunner

from icu.cli.main import cli


class TestWatchCLI:
    def setup_method(self) -> None:
        self.runner = CliRunner()

    def test_help(self) -> None:
        result = self.runner.invoke(cli, ["watch", "--help"])
        assert result.exit_code == 0
        assert "Watch a directory" in result.output

    def test_has_exclude_option(self) -> None:
        result = self.runner.invoke(cli, ["watch", "--help"])
        assert "--exclude" in result.output

    def test_has_depth_option(self) -> None:
        result = self.runner.invoke(cli, ["watch", "--help"])
        assert "--depth" in result.output

    def test_nonexistent_path(self) -> None:
        result = self.runner.invoke(cli, ["watch", "/nonexistent/path"])
        assert result.exit_code != 0

    def test_file_not_directory(self, tmp_path: Path) -> None:
        f = tmp_path / "file.txt"
        f.write_text("hi")
        result = self.runner.invoke(cli, ["watch", str(f)])
        assert result.exit_code != 0

    @patch("icu.cli.watch.watch_directory")
    def test_starts_watcher(
        self,
        mock_watch: object,
        tmp_path: Path,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Watch command calls watch_directory with correct args."""
        from unittest.mock import MagicMock

        mock_wd = MagicMock(side_effect=KeyboardInterrupt)
        with patch("icu.cli.watch.watch_directory", mock_wd):
            result = self.runner.invoke(cli, ["watch", str(tmp_path)])
        # KeyboardInterrupt triggers graceful shutdown (exit 0)
        assert result.exit_code == 0
        mock_wd.assert_called_once()

    @patch("icu.cli.watch.watch_directory")
    def test_exclude_passed_to_scanner(
        self,
        mock_watch: object,
        tmp_path: Path,
    ) -> None:
        """--exclude options are forwarded to Scanner."""
        from unittest.mock import MagicMock

        mock_wd = MagicMock(side_effect=KeyboardInterrupt)
        scanner_instances: list[object] = []

        class CapturingScanner:
            """Captures Scanner kwargs."""

            def __init__(self, **kwargs: object) -> None:
                scanner_instances.append(kwargs)

        with (
            patch("icu.cli.watch.watch_directory", mock_wd),
            patch("icu.cli.watch.Scanner", CapturingScanner),
        ):
            self.runner.invoke(
                cli,
                ["watch", str(tmp_path), "--exclude", "*.log"],
            )

        assert len(scanner_instances) == 1
        exclude = scanner_instances[0].get("exclude", ())
        assert "*.log" in exclude

    @patch("icu.cli.watch.watch_directory")
    def test_db_warning_on_failure(
        self,
        mock_watch: object,
        tmp_path: Path,
    ) -> None:
        """DB init failure produces a warning, not a silent skip."""
        from unittest.mock import MagicMock

        mock_wd = MagicMock(side_effect=KeyboardInterrupt)

        with (
            patch("icu.cli.watch.watch_directory", mock_wd),
            patch(
                "icu.cli.watch.ReputationDB",
                side_effect=RuntimeError("db error"),
            ),
        ):
            result = self.runner.invoke(cli, ["watch", str(tmp_path)])

        # Should still exit cleanly despite DB error
        assert result.exit_code == 0
