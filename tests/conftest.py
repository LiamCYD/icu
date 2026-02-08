from __future__ import annotations

from pathlib import Path

import pytest

from icu.analyzer.scanner import Scanner
from icu.policy.defaults import default_policy
from icu.policy.engine import PolicyEngine
from icu.policy.models import Policy
from icu.reputation.database import ReputationDB

_FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


@pytest.fixture
def clean_dir() -> Path:
    return _FIXTURES_DIR / "clean"


@pytest.fixture
def malicious_dir() -> Path:
    return _FIXTURES_DIR / "malicious"


@pytest.fixture
def tmp_db(tmp_path: Path) -> ReputationDB:
    db = ReputationDB(db_path=tmp_path / "test_reputation.db")
    yield db  # type: ignore[misc]
    db.close()


@pytest.fixture
def scanner(tmp_db: ReputationDB) -> Scanner:
    return Scanner(db=tmp_db)


@pytest.fixture
def default_policy_obj() -> Policy:
    return default_policy()


@pytest.fixture
def policy_engine(default_policy_obj: Policy) -> PolicyEngine:
    return PolicyEngine(default_policy_obj)
