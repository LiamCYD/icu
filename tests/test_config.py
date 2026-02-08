"""Tests for configuration loading."""

from __future__ import annotations

from pathlib import Path

from icu.config import ICUConfig, load_config, load_icuignore


class TestICUConfigDefaults:
    def test_defaults(self) -> None:
        cfg = ICUConfig()
        assert cfg.depth == "auto"
        assert cfg.max_file_size == 1_048_576
        assert cfg.exclude == ()
        assert cfg.policy_path is None
        assert cfg.no_db is False

    def test_frozen(self) -> None:
        cfg = ICUConfig()
        try:
            cfg.depth = "fast"  # type: ignore[misc]
            raise AssertionError("Expected FrozenInstanceError")
        except AttributeError:
            pass


class TestLoadConfig:
    def test_no_config_returns_defaults(self, tmp_path: Path) -> None:
        cfg = load_config(start=tmp_path)
        assert cfg.depth == "auto"
        assert cfg.max_file_size == 1_048_576

    def test_project_config_loaded(self, tmp_path: Path) -> None:
        (tmp_path / ".icu.yml").write_text(
            "depth: deep\nmax_file_size: 500000\n"
        )
        cfg = load_config(start=tmp_path)
        assert cfg.depth == "deep"
        assert cfg.max_file_size == 500000

    def test_yaml_suffix_supported(self, tmp_path: Path) -> None:
        (tmp_path / ".icu.yaml").write_text("depth: fast\n")
        cfg = load_config(start=tmp_path)
        assert cfg.depth == "fast"

    def test_exclude_from_config(self, tmp_path: Path) -> None:
        (tmp_path / ".icu.yml").write_text(
            "exclude:\n  - '*.log'\n  - 'vendor/*'\n"
        )
        cfg = load_config(start=tmp_path)
        assert "*.log" in cfg.exclude
        assert "vendor/*" in cfg.exclude

    def test_invalid_yaml_returns_defaults(self, tmp_path: Path) -> None:
        (tmp_path / ".icu.yml").write_text(": invalid: yaml: [")
        cfg = load_config(start=tmp_path)
        assert cfg.depth == "auto"

    def test_no_db_from_config(self, tmp_path: Path) -> None:
        (tmp_path / ".icu.yml").write_text("no_db: true\n")
        cfg = load_config(start=tmp_path)
        assert cfg.no_db is True


class TestLoadICUIgnore:
    def test_no_icuignore_returns_empty(self, tmp_path: Path) -> None:
        patterns = load_icuignore(start=tmp_path)
        assert patterns == ()

    def test_parses_patterns(self, tmp_path: Path) -> None:
        (tmp_path / ".icuignore").write_text(
            "*.log\n# comment\n\nvendor/*\n"
        )
        patterns = load_icuignore(start=tmp_path)
        assert "*.log" in patterns
        assert "vendor/*" in patterns
        assert len(patterns) == 2  # comments and blanks excluded

    def test_icuignore_merged_with_config_exclude(
        self, tmp_path: Path,
    ) -> None:
        (tmp_path / ".icu.yml").write_text("exclude:\n  - '*.tmp'\n")
        (tmp_path / ".icuignore").write_text("*.log\n")
        cfg = load_config(start=tmp_path)
        assert "*.tmp" in cfg.exclude
        assert "*.log" in cfg.exclude

    def test_walks_up_to_find_icuignore(self, tmp_path: Path) -> None:
        (tmp_path / ".icuignore").write_text("*.log\n")
        subdir = tmp_path / "a" / "b"
        subdir.mkdir(parents=True)
        patterns = load_icuignore(start=subdir)
        assert "*.log" in patterns
