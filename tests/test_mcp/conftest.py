from __future__ import annotations

from pathlib import Path

import pytest

from icu.reputation.database import ReputationDB

_FIXTURES_DIR = Path(__file__).parent.parent.parent / "fixtures"


@pytest.fixture(autouse=True)
def _reset_mcp_globals() -> None:  # type: ignore[misc]
    """Reset lazy-initialized globals between tests."""
    import icu.mcp.server as srv

    srv._scanner = None
    srv._db = None
    yield
    srv._scanner = None
    srv._db = None


@pytest.fixture
def mcp_db(tmp_path: Path) -> ReputationDB:
    db = ReputationDB(db_path=tmp_path / "mcp_test.db")
    yield db  # type: ignore[misc]
    db.close()


@pytest.fixture
def clean_fixtures() -> Path:
    return _FIXTURES_DIR / "clean"


@pytest.fixture
def malicious_fixtures() -> Path:
    return _FIXTURES_DIR / "malicious"
