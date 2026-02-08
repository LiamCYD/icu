"""Tests for reputation database threat signature CRUD and scan history."""

from __future__ import annotations

from icu.reputation.database import ReputationDB, seed_default_signatures
from icu.reputation.models import ThreatSignature


class TestThreatSignatureCRUD:
    def test_add_returns_id(self, tmp_db: ReputationDB) -> None:
        sig = ThreatSignature(
            name="test", category="test_cat", pattern="foo.*bar", severity="warning"
        )
        sig_id = tmp_db.add_threat_signature(sig)
        assert isinstance(sig_id, int)
        assert sig_id >= 1

    def test_add_auto_increments(self, tmp_db: ReputationDB) -> None:
        sig1 = ThreatSignature(name="a", category="c", pattern="x", severity="info")
        sig2 = ThreatSignature(name="b", category="c", pattern="y", severity="info")
        id1 = tmp_db.add_threat_signature(sig1)
        id2 = tmp_db.add_threat_signature(sig2)
        assert id2 > id1

    def test_get_all(self, tmp_db: ReputationDB) -> None:
        tmp_db.add_threat_signature(
            ThreatSignature(name="a", category="cat1", pattern="x", severity="info")
        )
        tmp_db.add_threat_signature(
            ThreatSignature(name="b", category="cat2", pattern="y", severity="warning")
        )
        sigs = tmp_db.get_threat_signatures()
        assert len(sigs) == 2
        assert sigs[0].name == "a"
        assert sigs[1].name == "b"

    def test_get_by_category(self, tmp_db: ReputationDB) -> None:
        tmp_db.add_threat_signature(
            ThreatSignature(name="a", category="cat1", pattern="x", severity="info")
        )
        tmp_db.add_threat_signature(
            ThreatSignature(name="b", category="cat2", pattern="y", severity="info")
        )
        sigs = tmp_db.get_threat_signatures(category="cat1")
        assert len(sigs) == 1
        assert sigs[0].name == "a"

    def test_get_empty_category(self, tmp_db: ReputationDB) -> None:
        tmp_db.add_threat_signature(
            ThreatSignature(name="a", category="cat1", pattern="x", severity="info")
        )
        sigs = tmp_db.get_threat_signatures(category="nonexistent")
        assert len(sigs) == 0

    def test_remove_existing(self, tmp_db: ReputationDB) -> None:
        sig_id = tmp_db.add_threat_signature(
            ThreatSignature(name="a", category="c", pattern="x", severity="info")
        )
        assert tmp_db.remove_threat_signature(sig_id) is True
        assert tmp_db.count_threat_signatures() == 0

    def test_remove_nonexistent(self, tmp_db: ReputationDB) -> None:
        assert tmp_db.remove_threat_signature(9999) is False

    def test_count_empty(self, tmp_db: ReputationDB) -> None:
        assert tmp_db.count_threat_signatures() == 0

    def test_count_after_adds(self, tmp_db: ReputationDB) -> None:
        tmp_db.add_threat_signature(
            ThreatSignature(name="a", category="c", pattern="x", severity="info")
        )
        tmp_db.add_threat_signature(
            ThreatSignature(name="b", category="c", pattern="y", severity="info")
        )
        assert tmp_db.count_threat_signatures() == 2

    def test_roundtrip_fields(self, tmp_db: ReputationDB) -> None:
        sig = ThreatSignature(
            name="Webhook Exfil",
            category="data_exfiltration",
            pattern=r"webhook\.site",
            severity="critical",
            description="Catches webhook.site URLs",
            source="manual",
        )
        sig_id = tmp_db.add_threat_signature(sig)
        sigs = tmp_db.get_threat_signatures()
        assert len(sigs) == 1
        stored = sigs[0]
        assert stored.id == sig_id
        assert stored.name == "Webhook Exfil"
        assert stored.category == "data_exfiltration"
        assert stored.pattern == r"webhook\.site"
        assert stored.severity == "critical"
        assert stored.description == "Catches webhook.site URLs"
        assert stored.source == "manual"
        assert stored.added_date is not None


class TestSeedSignatures:
    def test_seeds_empty_db(self, tmp_db: ReputationDB) -> None:
        count = seed_default_signatures(tmp_db)
        assert count > 0
        assert tmp_db.count_threat_signatures() == count

    def test_skips_populated_db(self, tmp_db: ReputationDB) -> None:
        tmp_db.add_threat_signature(
            ThreatSignature(name="existing", category="c", pattern="x", severity="info")
        )
        count = seed_default_signatures(tmp_db)
        assert count == 0
        assert tmp_db.count_threat_signatures() == 1

    def test_returns_count(self, tmp_db: ReputationDB) -> None:
        count = seed_default_signatures(tmp_db)
        assert count == tmp_db.count_threat_signatures()


class TestGetScanHistory:
    def test_empty_history(self, tmp_db: ReputationDB) -> None:
        history = tmp_db.get_scan_history("deadbeef" * 8)
        assert history == []

    def test_returns_entries(self, tmp_db: ReputationDB) -> None:
        sha = "a" * 64
        tmp_db.log_scan(sha, "fast", "clean", duration_ms=1.5)
        tmp_db.log_scan(sha, "deep", "critical", duration_ms=5.0)

        history = tmp_db.get_scan_history(sha)
        assert len(history) == 2
        # Most recent first
        assert history[0]["result"] == "critical"
        assert history[1]["result"] == "clean"

    def test_respects_limit(self, tmp_db: ReputationDB) -> None:
        sha = "b" * 64
        for i in range(5):
            tmp_db.log_scan(sha, "fast", "clean", duration_ms=float(i))

        history = tmp_db.get_scan_history(sha, limit=3)
        assert len(history) == 3
