"""Tests for the real-time file watcher."""

from __future__ import annotations

import threading
import time
from pathlib import Path
from unittest.mock import MagicMock

from icu.analyzer.models import ScanResult
from icu.runtime.watcher import ICUEventHandler, watch_directory


def _make_mock_scanner(risk: str = "clean", findings: tuple = ()) -> MagicMock:
    scanner = MagicMock()
    scanner.scan_file.return_value = ScanResult(
        file_path="test.py",
        risk_level=risk,
        findings=findings,
        scan_time_ms=1.0,
    )
    return scanner


class _FakeEvent:
    """Minimal stand-in for watchdog FileSystemEvent."""

    def __init__(self, src_path: str, is_directory: bool = False) -> None:
        self.src_path = src_path
        self.is_directory = is_directory


class TestShouldSkipEvent:
    """Events for skipped paths/extensions should never enqueue."""

    def test_pycache_skipped(self) -> None:
        scanner = _make_mock_scanner()
        handler = ICUEventHandler(scanner, debounce_seconds=0.0)
        handler.on_created(_FakeEvent("/project/__pycache__/mod.pyc"))
        time.sleep(0.3)
        handler.stop()
        scanner.scan_file.assert_not_called()

    def test_git_dir_skipped(self) -> None:
        scanner = _make_mock_scanner()
        handler = ICUEventHandler(scanner, debounce_seconds=0.0)
        handler.on_modified(_FakeEvent("/project/.git/objects/abc"))
        time.sleep(0.3)
        handler.stop()
        scanner.scan_file.assert_not_called()

    def test_png_skipped(self) -> None:
        scanner = _make_mock_scanner()
        handler = ICUEventHandler(scanner, debounce_seconds=0.0)
        handler.on_created(_FakeEvent("/project/image.png"))
        time.sleep(0.3)
        handler.stop()
        scanner.scan_file.assert_not_called()

    def test_py_allowed(self, tmp_path: Path) -> None:
        py_file = tmp_path / "hello.py"
        py_file.write_text("print('hi')")
        scanner = _make_mock_scanner()
        handler = ICUEventHandler(scanner, debounce_seconds=0.0)
        handler.on_created(_FakeEvent(str(py_file)))
        time.sleep(0.3)
        handler.stop()
        scanner.scan_file.assert_called_once()


class TestICUEventHandler:
    def test_debounce_coalesces_rapid_events(self, tmp_path: Path) -> None:
        py_file = tmp_path / "rapid.py"
        py_file.write_text("x = 1")
        scanner = _make_mock_scanner()
        handler = ICUEventHandler(scanner, debounce_seconds=0.2)

        # Fire 5 rapid events for the same file
        for _ in range(5):
            handler.on_modified(_FakeEvent(str(py_file)))
            time.sleep(0.02)

        # Wait for debounce to flush
        time.sleep(0.5)
        handler.stop()

        # Should have scanned only once due to debounce
        assert scanner.scan_file.call_count == 1

    def test_callback_receives_scan_result(self, tmp_path: Path) -> None:
        py_file = tmp_path / "cb.py"
        py_file.write_text("x = 1")
        results: list[ScanResult] = []
        scanner = _make_mock_scanner()
        handler = ICUEventHandler(
            scanner, debounce_seconds=0.0, on_result=results.append
        )
        handler.on_created(_FakeEvent(str(py_file)))
        time.sleep(0.3)
        handler.stop()
        assert len(results) == 1
        assert results[0].risk_level == "clean"

    def test_directory_events_ignored(self) -> None:
        scanner = _make_mock_scanner()
        handler = ICUEventHandler(scanner, debounce_seconds=0.0)
        handler.on_created(_FakeEvent("/project/subdir", is_directory=True))
        handler.on_modified(_FakeEvent("/project/subdir", is_directory=True))
        time.sleep(0.3)
        handler.stop()
        scanner.scan_file.assert_not_called()

    def test_binary_extension_skipped(self) -> None:
        scanner = _make_mock_scanner()
        handler = ICUEventHandler(scanner, debounce_seconds=0.0)
        handler.on_created(_FakeEvent("/project/lib.so"))
        time.sleep(0.3)
        handler.stop()
        scanner.scan_file.assert_not_called()

    def test_deleted_file_not_scanned(self, tmp_path: Path) -> None:
        """If a file is deleted between enqueue and flush, skip it."""
        gone = tmp_path / "gone.py"
        # Don't create the file — it doesn't exist
        scanner = _make_mock_scanner()
        handler = ICUEventHandler(scanner, debounce_seconds=0.0)
        # Bypass skip checks by directly putting in pending
        with handler._lock:
            handler._pending[str(gone)] = time.monotonic() - 1
        time.sleep(0.3)
        handler.stop()
        scanner.scan_file.assert_not_called()


class TestWatchDirectory:
    def test_starts_and_stops_cleanly(self, tmp_path: Path) -> None:
        scanner = _make_mock_scanner()
        stop = threading.Event()

        t = threading.Thread(
            target=watch_directory,
            kwargs={
                "path": tmp_path,
                "scanner": scanner,
                "stop_event": stop,
                "debounce_seconds": 0.1,
            },
        )
        t.start()
        time.sleep(0.3)
        stop.set()
        t.join(timeout=2)
        assert not t.is_alive()

    def test_detects_new_file(self, tmp_path: Path) -> None:
        results: list[ScanResult] = []
        scanner = _make_mock_scanner()
        stop = threading.Event()

        t = threading.Thread(
            target=watch_directory,
            kwargs={
                "path": tmp_path,
                "scanner": scanner,
                "on_result": results.append,
                "stop_event": stop,
                "debounce_seconds": 0.1,
            },
        )
        t.start()
        time.sleep(0.5)

        # Create a new file
        new_file = tmp_path / "new.py"
        new_file.write_text("x = 1")

        # Wait for detection
        deadline = time.monotonic() + 2.0
        while not results and time.monotonic() < deadline:
            time.sleep(0.1)

        stop.set()
        t.join(timeout=2)

        assert len(results) >= 1

    def test_detects_modified_file(self, tmp_path: Path) -> None:
        existing = tmp_path / "existing.py"
        existing.write_text("x = 1")

        results: list[ScanResult] = []
        scanner = _make_mock_scanner()
        stop = threading.Event()

        t = threading.Thread(
            target=watch_directory,
            kwargs={
                "path": tmp_path,
                "scanner": scanner,
                "on_result": results.append,
                "stop_event": stop,
                "debounce_seconds": 0.1,
            },
        )
        t.start()
        time.sleep(0.5)

        # Modify existing file
        existing.write_text("x = 2")

        deadline = time.monotonic() + 2.0
        while not results and time.monotonic() < deadline:
            time.sleep(0.1)

        stop.set()
        t.join(timeout=2)

        assert len(results) >= 1
