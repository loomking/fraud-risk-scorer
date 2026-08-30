"""
Database models — SQLAlchemy + SQLite (Section 20).

Real persistence layer from the start — NO in-memory dicts/lists/mocks.
Audit log is append-only (no updates, no deletes).
"""

import logging
from datetime import datetime

from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime, Text, JSON,
    event, create_engine, inspect,
)
from sqlalchemy.orm import DeclarativeBase, Session

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


class Transaction(Base):
    """Raw scored transaction record."""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, unique=True, nullable=False, index=True)
    raw_data = Column(JSON, nullable=False)  # Original transaction fields
    created_at = Column(DateTime, default=datetime.utcnow)


class Score(Base):
    """Fraud risk score with full provenance (Section 20, 21)."""
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, nullable=False, index=True)
    model_version = Column(String, nullable=False)
    feature_pipeline_version = Column(String, nullable=False)
    calibration_version = Column(String, nullable=False)
    threshold_config_version = Column(String, nullable=False)
    risk_score = Column(Float, nullable=False)           # Raw model output
    calibrated_probability = Column(Float, nullable=False)  # After calibration
    threshold = Column(Float, nullable=False)
    fp_cost_assumption = Column(Float, nullable=False)
    fn_cost_assumption = Column(Float, nullable=False)
    decision = Column(String, nullable=False)             # "PASS" or "FLAG"
    feature_hash = Column(String, nullable=True)          # Hash of feature vector
    created_at = Column(DateTime, default=datetime.utcnow)


class EvidencePacket(Base):
    """Generated evidence for flagged transactions (Section 20)."""
    __tablename__ = "evidence_packets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, nullable=False, index=True)
    evidence = Column(JSON, nullable=False)
    source_fields = Column(JSON, nullable=False)
    agent_model_version = Column(String, nullable=False)
    prompt_version = Column(String, nullable=False)
    grounding_valid = Column(Boolean, nullable=False)
    grounding_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    """
    Append-only audit log (Section 20).

    Must NEVER be edited or deleted in place.
    Events: score_computed, decision_made, evidence_generated,
    grounding_validation, grounding_failure, human_override.
    """
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, nullable=False, index=True)
    event_type = Column(String, nullable=False)
    event_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Append-only protection for audit_log (Section 20) ─────────────────────

def _prevent_audit_update(mapper, connection, target):
    """Raise error if someone tries to update an audit log entry."""
    insp = inspect(target)
    if not insp.pending:
        raise RuntimeError(
            "AUDIT INTEGRITY VIOLATION: Audit log entries must never be "
            "updated in place. Create a new entry instead."
        )


def _prevent_audit_delete(mapper, connection, target):
    """Raise error if someone tries to delete an audit log entry."""
    raise RuntimeError(
        "AUDIT INTEGRITY VIOLATION: Audit log entries must never be deleted."
    )


event.listen(AuditLog, "before_update", _prevent_audit_update)
event.listen(AuditLog, "before_delete", _prevent_audit_delete)
