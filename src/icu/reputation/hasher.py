from __future__ import annotations

import hashlib
from pathlib import Path

_CHUNK_SIZE = 8192


def hash_file(path: str | Path) -> str:
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(_CHUNK_SIZE):
            sha256.update(chunk)
    return sha256.hexdigest()


def hash_content(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
