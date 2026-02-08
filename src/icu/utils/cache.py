from __future__ import annotations

import threading
from collections import OrderedDict
from typing import TypeVar

T = TypeVar("T")


class HashCache:
    """Bounded LRU cache backed by OrderedDict. Thread-safe."""

    def __init__(self, max_size: int = 4096) -> None:
        self._max_size = max_size
        self._cache: OrderedDict[str, object] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> object | None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                return self._cache[key]
            return None

    def put(self, key: str, value: object) -> None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                self._cache[key] = value
            else:
                self._cache[key] = value
                if len(self._cache) > self._max_size:
                    self._cache.popitem(last=False)

    def __contains__(self, key: str) -> bool:
        with self._lock:
            return key in self._cache

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
