"""Tests for git hook generation, install, and CLI."""

from __future__ import annotations

import stat
from pathlib import Path

import pytest
from click.testing import CliRunner

from icu.cli.main import cli
from icu.integrations.hooks import (
    ICU_HOOK_MARKER,
    HookError,
    find_git_root,
    generate_hook_script,
    install_hook,
    uninstall_hook,
)


class TestGenerateHookScript:
    def test_contains_marker(self) -> None:
        script = generate_hook_script()
        assert ICU_HOOK_MARKER in script

    def test_valid_bash_header(self) -> None:
        script = generate_hook_script()
        assert script.startswith("#!/usr/bin/env bash")
        assert "git diff --cached --name-only" in script


class TestFindGitRoot:
    def test_finds_in_cwd(self, tmp_path: Path) -> None:
        (tmp_path / ".git").mkdir()
        result = find_git_root(start=tmp_path)
        assert result == tmp_path

    def test_finds_in_parent(self, tmp_path: Path) -> None:
        (tmp_path / ".git").mkdir()
        child = tmp_path / "sub" / "deep"
        child.mkdir(parents=True)
        result = find_git_root(start=child)
        assert result == tmp_path

    def test_returns_none_when_absent(self, tmp_path: Path) -> None:
        # tmp_path has no .git
        result = find_git_root(start=tmp_path)
        assert result is None


class TestInstallHook:
    def test_creates_executable_hook(self, tmp_path: Path) -> None:
        (tmp_path / ".git" / "hooks").mkdir(parents=True)
        msg = install_hook(tmp_path)
        hook = tmp_path / ".git" / "hooks" / "pre-commit"

        assert "installed" in msg.lower()
        assert hook.exists()
        assert ICU_HOOK_MARKER in hook.read_text()
        # Check executable bit
        mode = hook.stat().st_mode
        assert mode & stat.S_IXUSR

    def test_idempotent(self, tmp_path: Path) -> None:
        (tmp_path / ".git" / "hooks").mkdir(parents=True)
        install_hook(tmp_path)
        msg = install_hook(tmp_path)
        assert "already installed" in msg.lower()

    def test_refuses_non_icu_overwrite(self, tmp_path: Path) -> None:
        hooks_dir = tmp_path / ".git" / "hooks"
        hooks_dir.mkdir(parents=True)
        (hooks_dir / "pre-commit").write_text("#!/bin/sh\necho custom hook\n")
        with pytest.raises(HookError, match="not installed by ICU"):
            install_hook(tmp_path)

    def test_uninstall_removes(self, tmp_path: Path) -> None:
        (tmp_path / ".git" / "hooks").mkdir(parents=True)
        install_hook(tmp_path)
        hook = tmp_path / ".git" / "hooks" / "pre-commit"
        assert hook.exists()

        msg = uninstall_hook(tmp_path)
        assert "removed" in msg.lower()
        assert not hook.exists()


class TestUninstallHook:
    def test_no_hook_found(self, tmp_path: Path) -> None:
        (tmp_path / ".git" / "hooks").mkdir(parents=True)
        msg = uninstall_hook(tmp_path)
        assert "no pre-commit hook found" in msg.lower()

    def test_leaves_non_icu_hook(self, tmp_path: Path) -> None:
        hooks_dir = tmp_path / ".git" / "hooks"
        hooks_dir.mkdir(parents=True)
        hook = hooks_dir / "pre-commit"
        hook.write_text("#!/bin/sh\necho custom\n")
        msg = uninstall_hook(tmp_path)
        assert "not installed by icu" in msg.lower()
        assert hook.exists()


class TestHookCLI:
    def setup_method(self) -> None:
        self.runner = CliRunner()

    def test_install_no_git_errors(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.chdir(tmp_path)
        result = self.runner.invoke(cli, ["hook", "install"])
        assert result.exit_code != 0

    def test_install_success(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        (tmp_path / ".git" / "hooks").mkdir(parents=True)
        monkeypatch.chdir(tmp_path)
        result = self.runner.invoke(cli, ["hook", "install"])
        assert result.exit_code == 0
        hook = tmp_path / ".git" / "hooks" / "pre-commit"
        assert hook.exists()

    def test_uninstall_success(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        (tmp_path / ".git" / "hooks").mkdir(parents=True)
        monkeypatch.chdir(tmp_path)
        self.runner.invoke(cli, ["hook", "install"])
        result = self.runner.invoke(cli, ["hook", "uninstall"])
        assert result.exit_code == 0

    def test_help_text(self) -> None:
        result = self.runner.invoke(cli, ["hook", "--help"])
        assert result.exit_code == 0
        assert "pre-commit" in result.output.lower()
