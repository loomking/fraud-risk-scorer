"""
Database tests (Section 32).

Tests: provenance persisted, audit log append-only, required events created.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.db.models import Base, Transaction, Score, AuditLog, EvidencePacket


@pytest.fixture
def db_session():
    """Create a fresh in-memory SQLite database for each test."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


class TestAuditLogAppendOnly:
    """Audit log must never be updated or deleted (Section 20)."""

    def test_audit_insert_works(self, db_session):
        """Normal inserts should work."""
        entry = AuditLog(
            transaction_id=1,
            event_type="score_computed",
            event_data={"score": 0.85},
        )
        db_session.add(entry)
        db_session.commit()
        assert entry.id is not None

    def test_audit_delete_prevented(self, db_session):
        """Deleting audit entries must raise an error."""
        entry = AuditLog(
            transaction_id=1,
            event_type="test_event",
        )
        db_session.add(entry)
        db_session.commit()

        with pytest.raises(RuntimeError, match="AUDIT INTEGRITY"):
            db_session.delete(entry)
            db_session.commit()

    def test_audit_update_prevented(self, db_session):
        """Updating audit entries must raise an error."""
        entry = AuditLog(
            transaction_id=1,
            event_type="original_event",
        )
        db_session.add(entry)
        db_session.commit()

        entry.event_type = "tampered_event"
        with pytest.raises(RuntimeError, match="AUDIT INTEGRITY"):
            db_session.commit()


class TestProvenancePersistence:
    """Score records must include full provenance (Section 20, 21)."""

    def test_score_has_provenance_fields(self, db_session):
        """Score record must have model, calibration, threshold versions."""
        score = Score(
            transaction_id=1,
            model_version="v1.0.0",
            feature_pipeline_version="v1.0.0",
            calibration_version="v1.0.0",
            threshold_config_version="v1.0.0",
            risk_score=0.85,
            calibrated_probability=0.82,
            threshold=0.15,
            fp_cost_assumption=50.0,
            fn_cost_assumption=3000.0,
            decision="FLAG",
            feature_hash="abc123",
        )
        db_session.add(score)
        db_session.commit()

        loaded = db_session.query(Score).filter_by(transaction_id=1).first()
        assert loaded.model_version == "v1.0.0"
        assert loaded.feature_pipeline_version == "v1.0.0"
        assert loaded.calibration_version == "v1.0.0"
        assert loaded.threshold_config_version == "v1.0.0"
        assert loaded.feature_hash == "abc123"
        assert loaded.fp_cost_assumption == 50.0

    def test_transaction_stores_raw_data(self, db_session):
        """Transaction must store the original raw data."""
        txn = Transaction(
            transaction_id=42,
            raw_data={"TransactionAmt": 100.0, "ProductCD": "W"},
        )
        db_session.add(txn)
        db_session.commit()

        loaded = db_session.query(Transaction).filter_by(transaction_id=42).first()
        assert loaded.raw_data["TransactionAmt"] == 100.0
