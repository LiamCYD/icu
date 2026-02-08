"""Real-time file system watcher that scans files as they are created/modified."""

from __future__ import annotations

import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from icu.analyzer.scanner import _SKIP_EXTENSIONS, ScanDepth, _should_skip_path

if TYPE_CHECKING:
    from icu.analyzer.models import ScanResult
    from icu.analyzer.scanner import Scanner


class ICUEventHandler(FileSystemEventHandler):
    """Watchdog handler that debounces file events and scans via ICU."""

    def __init__(
        self,
        scanner: Scanner,
        depth: ScanDepth = "auto",
        on_result: Callable[[ScanResult], None] | None = None,
        debounce_seconds: float = 0.5,
    ) -> None:
        super().__init__()
        self._scanner = scanner
        self._depth = depth
        self._on_result = on_result
        self._debounce_seconds = debounce_seconds

        self._pending: dict[str, float] = {}
        self._lock = threading.Lock()
        self._stop = threading.Event()

        self._flush_thread = threading.Thread(
            target=self._flush_loop, daemon=True
        )
        self._flush_thread.start()

    def stop(self) -> None:
        """Signal the flush thread to stop."""
        self._stop.set()

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._enqueue(str(event.src_path))

    def on_modified(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._enqueue(str(event.src_path))

    def _enqueue(self, path: str) -> None:
        p = Path(path)
        if _should_skip_path(p):
            return
        if p.suffix.lower() in _SKIP_EXTENSIONS:
            return
        with self._lock:
            self._pending[path] = time.monotonic()

    def _flush_loop(self) -> None:
        while not self._stop.is_set():
            self._stop.wait(timeout=0.1)
            self._flush_ready()

    def _flush_ready(self) -> None:
        now = time.monotonic()
        ready: list[str] = []

        with self._lock:
            for path, ts in list(self._pending.items()):
                if now - ts >= self._debounce_seconds:
                    ready.append(path)
            for path in ready:
                del self._pending[path]

        for path in ready:
            file_path = Path(path)
            if not file_path.is_file():
                continue
            result = self._scanner.scan_file(file_path, depth=self._depth)
            if self._on_result is not None:
                self._on_result(result)


def watch_directory(
    path: Path,
    scanner: Scanner,
    depth: ScanDepth = "auto",
    on_result: Callable[[ScanResult], None] | None = None,
    stop_event: threading.Event | None = None,
    debounce_seconds: float = 0.5,
) -> None:
    """Watch a directory for file changes, scanning each with ICU.

    Blocks until *stop_event* is set (or forever if None).
    """
    if stop_event is None:
        stop_event = threading.Event()

    handler = ICUEventHandler(
        scanner=scanner,
        depth=depth,
        on_result=on_result,
        debounce_seconds=debounce_seconds,
    )

    observer = Observer()
    observer.schedule(handler, str(path), recursive=True)
    observer.start()

    try:
        stop_event.wait()
    finally:
        handler.stop()
        observer.stop()
        observer.join(timeout=5)
