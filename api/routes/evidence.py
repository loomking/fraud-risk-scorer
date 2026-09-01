"""
POST /evidence/{transaction_id} — Evidence generation (Section 28.2).

Only flagged transactions may invoke evidence generation.
The LLM cannot make the fraud decision (Section 2.7).
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.schemas import EvidenceResponseSchema
from src.db.session import get_db
from src.db.models import Score, EvidencePacket, AuditLog, Transaction
from src.agent.evidence_agent import build_evidence_context, generate_evidence
from src.agent.prompts import PROMPT_VERSION
from src.config import GROQ_MODEL

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{transaction_id}", response_model=EvidenceResponseSchema)
def generate_evidence_endpoint(transaction_id: int, db: Session = Depends(get_db)):
    """
    Generate evidence for a flagged transaction.
    Only works if the transaction was flagged by the ML model.
    """
    # Get the latest score for this transaction
    score = db.query(Score).filter(
        Score.transaction_id == transaction_id
    ).order_by(Score.created_at.desc()).first()

    if not score:
        raise HTTPException(status_code=404, detail=f"No score found for transaction {transaction_id}")

    # Only flagged transactions (Section 2.7)
    if score.decision != "FLAG":
        raise HTTPException(
            status_code=400,
            detail=f"Transaction {transaction_id} was not flagged (decision={score.decision}). "
                   f"Evidence generation is only available for flagged transactions."
        )

    # Get raw transaction data
    txn = db.query(Transaction).filter(
        Transaction.transaction_id == transaction_id
    ).first()

    raw_data = txn.raw_data if txn else {}

    # Dynamically compute the 22 engineered features exactly as they were scored
    from api.routes.score import _load_artifacts, _build_v2_feature_vector
    _, feature_columns, freq_maps = _load_artifacts()
    _, features_dict = _build_v2_feature_vector(raw_data, feature_columns, freq_maps)

    # Build evidence context (Section 22)
    context = build_evidence_context(
        transaction_data=raw_data,
        risk_probability=score.calibrated_probability,
        threshold=score.threshold,
        decision=score.decision,
        computed_features=features_dict,
    )

    # Generate evidence
    try:
        evidence_response = generate_evidence(
            transaction_id=transaction_id,
            context=context,
        )
    except Exception as e:
        logger.error(f"Evidence generation failed: {e}")
        # Record failure in audit log
        db.add(AuditLog(
            transaction_id=transaction_id,
            event_type="evidence_generation_failed",
            event_data={"error": str(e)},
        ))
        db.commit()
        raise HTTPException(status_code=500, detail=f"Evidence generation failed: {str(e)}")

    # Persist evidence packet
    db_evidence = EvidencePacket(
        transaction_id=transaction_id,
        evidence=[item.model_dump() for item in evidence_response.evidence],
        source_fields=list(context.keys()),
        agent_model_version=evidence_response.agent_model_version,
        prompt_version=evidence_response.prompt_version,
        grounding_valid=evidence_response.grounding_valid,
        grounding_details={"status": evidence_response.status},
    )
    db.add(db_evidence)

    # Audit log
    event_type = "evidence_generated" if evidence_response.grounding_valid else "grounding_failure"
    db.add(AuditLog(
        transaction_id=transaction_id,
        event_type=event_type,
        event_data={
            "status": evidence_response.status,
            "grounding_valid": evidence_response.grounding_valid,
            "num_claims": len(evidence_response.evidence),
            "agent_model": evidence_response.agent_model_version,
            "prompt_version": evidence_response.prompt_version,
        },
    ))
    db.commit()

    return EvidenceResponseSchema(
        transaction_id=transaction_id,
        status=evidence_response.status,
        evidence=[
            {"claim": item.claim, "sources": item.sources, "source_values": item.source_values}
            for item in evidence_response.evidence
        ],
        grounding_valid=evidence_response.grounding_valid,
        agent_model_version=evidence_response.agent_model_version,
        prompt_version=evidence_response.prompt_version,
        summary=evidence_response.summary,
    )
