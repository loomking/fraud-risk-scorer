"""
Pydantic request/response schemas for API contracts (Section 28).

Frontend depends on these explicit contracts, not internal structures.
"""

from pydantic import BaseModel, Field
from typing import Literal, Any


# ── POST /score (Section 28.1) ───────────────────────────────────────────────

class ScoreRequest(BaseModel):
    """
    Score request — uses exact Kaggle column casing.
    TransactionAmt (lowercase 'mt') per Section 28.1.
    """
    TransactionID: int
    TransactionDT: int
    TransactionAmt: float = Field(..., gt=0, description="Transaction amount (must be positive)")
    ProductCD: str
    card1: int | None = None
    card2: float | None = None
    card3: float | None = None
    card4: str | None = None
    card5: float | None = None
    card6: str | None = None
    addr1: float | None = None
    addr2: float | None = None
    dist1: float | None = None
    dist2: float | None = None
    P_emaildomain: str | None = None
    R_emaildomain: str | None = None
    C1: float | None = None
    C2: float | None = None
    C3: float | None = None
    C4: float | None = None
    C5: float | None = None
    C6: float | None = None
    C7: float | None = None
    C8: float | None = None
    C9: float | None = None
    C10: float | None = None
    C11: float | None = None
    C12: float | None = None
    C13: float | None = None
    C14: float | None = None
    D1: float | None = None
    DeviceType: str | None = None
    DeviceInfo: str | None = None


class ScoreResponse(BaseModel):
    """Score response with full provenance."""
    transaction_id: int
    risk_probability: float
    threshold: float
    decision: Literal["PASS", "FLAG"]
    model_version: str
    calibration_version: str
    feature_pipeline_version: str
    threshold_config_version: str


# ── POST /evidence/{transaction_id} (Section 28.2) ──────────────────────────

class EvidenceItemSchema(BaseModel):
    """Single evidence claim."""
    claim: str
    sources: list[str]
    source_values: dict[str, Any] = Field(default_factory=dict)


class EvidenceResponseSchema(BaseModel):
    """Evidence response."""
    transaction_id: int
    status: Literal["generated", "grounding_failed"]
    evidence: list[EvidenceItemSchema]
    grounding_valid: bool
    agent_model_version: str
    prompt_version: str
    summary: str = ""


# ── GET /audit/{transaction_id} (Section 28.3) ──────────────────────────────

class AuditEventSchema(BaseModel):
    """Single audit event."""
    id: int
    event_type: str
    event_data: dict[str, Any] | None
    created_at: str


class AuditResponse(BaseModel):
    """Audit trail response."""
    transaction_id: int
    events: list[AuditEventSchema]


# ── GET /report (Section 28.4) ──────────────────────────────────────────────

class ReportResponse(BaseModel):
    """Dashboard evaluation data."""
    model_version: str
    feature_count: int
    threshold: float
    fp_cost_assumption: float
    fn_cost_assumption: float
    metrics: dict[str, Any]
    sensitivity: list[dict[str, Any]]
    recent_transactions: list[dict[str, Any]]
