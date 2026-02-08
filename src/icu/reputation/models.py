from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class Signature:
    sha256: str
    name: str = ""
    version: str = ""
    source_url: str = ""
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    risk_level: str = "clean"
    scan_count: int = 1
    community_votes: int = 0
    flagged: bool = False
    notes: str = ""


@dataclass(frozen=True, slots=True)
class ThreatSignature:
    id: int | None = None
    name: str = ""
    category: str = ""
    pattern: str = ""
    severity: str = "warning"
    description: str = ""
    added_date: datetime | None = None
    source: str = "local"
