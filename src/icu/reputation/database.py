from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from icu.reputation.models import Signature, ThreatSignature
from icu.utils.logging import get_logger

_log = get_logger("reputation.db")

_DEFAULT_DB_DIR = Path.home() / ".icu"
_DEFAULT_DB_PATH = _DEFAULT_DB_DIR / "reputation.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS signatures (
    sha256          TEXT PRIMARY KEY,
    name            TEXT,
    version         TEXT,
    source_url      TEXT,
    first_seen      DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen       DATETIME DEFAULT CURRENT_TIMESTAMP,
    risk_level      TEXT CHECK(
        risk_level IN ('clean','low','medium','high','critical')
    ),
    scan_count      INTEGER DEFAULT 1,
    community_votes INTEGER DEFAULT 0,
    flagged         BOOLEAN DEFAULT FALSE,
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS threat_signatures (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    pattern         TEXT NOT NULL,
    severity        TEXT CHECK(severity IN ('info','warning','danger','critical')),
    description     TEXT,
    added_date      DATETIME DEFAULT CURRENT_TIMESTAMP,
    source          TEXT DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS behavioral_profiles (
    sha256          TEXT PRIMARY KEY,
    syscalls        TEXT,
    network_hosts   TEXT,
    files_accessed  TEXT,
    profile_date    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sha256) REFERENCES signatures(sha256)
);

CREATE TABLE IF NOT EXISTS scan_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sha256          TEXT,
    scan_type       TEXT,
    result          TEXT,
    findings_json   TEXT,
    duration_ms     REAL,
    timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signatures_risk ON signatures(risk_level);
CREATE INDEX IF NOT EXISTS idx_threat_sigs_category ON threat_signatures(category);
CREATE INDEX IF NOT EXISTS idx_scan_log_timestamp ON scan_log(timestamp);
"""


class ReputationDB:
    """SQLite-backed reputation database with WAL mode for concurrent reads."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        if db_path is None:
            _DEFAULT_DB_DIR.mkdir(parents=True, exist_ok=True)
            db_path = _DEFAULT_DB_PATH
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self._db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    def __enter__(self) -> ReputationDB:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def lookup_hash(self, sha256: str) -> Signature | None:
        row = self._conn.execute(
            "SELECT * FROM signatures WHERE sha256 = ?", (sha256,)
        ).fetchone()
        if row is None:
            return None
        return Signature(
            sha256=row["sha256"],
            name=row["name"] or "",
            version=row["version"] or "",
            source_url=row["source_url"] or "",
            first_seen=_parse_datetime(row["first_seen"]),
            last_seen=_parse_datetime(row["last_seen"]),
            risk_level=row["risk_level"] or "clean",
            scan_count=row["scan_count"] or 1,
            community_votes=row["community_votes"] or 0,
            flagged=bool(row["flagged"]),
            notes=row["notes"] or "",
        )

    def record_signature(self, sig: Signature) -> None:
        self._conn.execute(
            """
            INSERT INTO signatures
                (sha256, name, version, source_url,
                 risk_level, scan_count, flagged, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(sha256) DO UPDATE SET
                last_seen = CURRENT_TIMESTAMP,
                scan_count = scan_count + 1,
                risk_level = excluded.risk_level,
                flagged = excluded.flagged,
                notes = excluded.notes
            """,
            (
                sig.sha256,
                sig.name,
                sig.version,
                sig.source_url,
                sig.risk_level,
                sig.scan_count,
                sig.flagged,
                sig.notes,
            ),
        )
        self._conn.commit()

    def log_scan(
        self,
        sha256: str,
        scan_type: str,
        result: str,
        findings: list[dict[str, Any]] | None = None,
        duration_ms: float = 0.0,
    ) -> None:
        self._conn.execute(
            """
            INSERT INTO scan_log (sha256, scan_type, result, findings_json, duration_ms)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                sha256,
                scan_type,
                result,
                json.dumps(findings) if findings else None,
                duration_ms,
            ),
        )
        self._conn.commit()

    def is_known_good(self, sha256: str) -> bool:
        sig = self.lookup_hash(sha256)
        return sig is not None and sig.risk_level == "clean" and not sig.flagged

    def is_known_bad(self, sha256: str) -> bool:
        sig = self.lookup_hash(sha256)
        return sig is not None and (
            sig.risk_level in ("high", "critical") or sig.flagged
        )

    # ── Threat Signatures CRUD ────────────────────────────────

    def add_threat_signature(self, sig: ThreatSignature) -> int:
        cursor = self._conn.execute(
            """
            INSERT INTO threat_signatures
                (name, category, pattern, severity, description, source)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                sig.name,
                sig.category,
                sig.pattern,
                sig.severity,
                sig.description,
                sig.source,
            ),
        )
        self._conn.commit()
        return cursor.lastrowid  # type: ignore[return-value]

    def get_threat_signatures(
        self, category: str | None = None
    ) -> list[ThreatSignature]:
        if category is not None:
            rows = self._conn.execute(
                "SELECT * FROM threat_signatures WHERE category = ?",
                (category,),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM threat_signatures"
            ).fetchall()
        return [
            ThreatSignature(
                id=row["id"],
                name=row["name"],
                category=row["category"],
                pattern=row["pattern"],
                severity=row["severity"] or "warning",
                description=row["description"] or "",
                added_date=_parse_datetime(row["added_date"]),
                source=row["source"] or "local",
            )
            for row in rows
        ]

    def remove_threat_signature(self, sig_id: int) -> bool:
        cursor = self._conn.execute(
            "DELETE FROM threat_signatures WHERE id = ?", (sig_id,)
        )
        self._conn.commit()
        return cursor.rowcount > 0

    def count_threat_signatures(self) -> int:
        row = self._conn.execute(
            "SELECT COUNT(*) AS cnt FROM threat_signatures"
        ).fetchone()
        return int(row["cnt"])

    def get_scan_history(
        self, sha256: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        rows = self._conn.execute(
            """
            SELECT id, sha256, scan_type, result, findings_json,
                   duration_ms, timestamp
            FROM scan_log
            WHERE sha256 = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (sha256, limit),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "sha256": row["sha256"],
                "scan_type": row["scan_type"],
                "result": row["result"],
                "findings_json": row["findings_json"],
                "duration_ms": row["duration_ms"],
                "timestamp": row["timestamp"],
            }
            for row in rows
        ]


def seed_default_signatures(db: ReputationDB) -> int:
    """Load seed threat signatures from YAML if DB has none."""
    if db.count_threat_signatures() > 0:
        return 0

    import yaml

    seed_path = Path(__file__).parent / "seed_signatures.yml"
    if not seed_path.exists():
        _log.warning("Seed signatures file not found: %s", seed_path)
        return 0

    data = yaml.safe_load(seed_path.read_text(encoding="utf-8"))
    if not data or "signatures" not in data:
        return 0

    count = 0
    for entry in data["signatures"]:
        sig = ThreatSignature(
            name=entry["name"],
            category=entry["category"],
            pattern=entry["pattern"],
            severity=entry.get("severity", "warning"),
            description=entry.get("description", ""),
            source=entry.get("source", "seed"),
        )
        db.add_threat_signature(sig)
        count += 1

    return count


def _parse_datetime(val: str | None) -> datetime | None:
    if val is None:
        return None
    try:
        return datetime.fromisoformat(val)
    except (ValueError, TypeError):
        return None
