"""
GET /audit/{transaction_id} — Audit trail endpoint (Section 28.3).

Returns the complete decision trail for a transaction.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.schemas import AuditResponse, AuditEventSchema
from src.db.session import get_db
from src.db.models import AuditLog

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{transaction_id}", response_model=AuditResponse)
def get_audit_trail(transaction_id: int, db: Session = Depends(get_db)):
    """Return the complete audit trail for a transaction."""
    events = db.query(AuditLog).filter(
        AuditLog.transaction_id == transaction_id
    ).order_by(AuditLog.created_at.asc()).all()

    if not events:
        raise HTTPException(
            status_code=404,
            detail=f"No audit events found for transaction {transaction_id}"
        )

    return AuditResponse(
        transaction_id=transaction_id,
        events=[
            AuditEventSchema(
                id=event.id,
                event_type=event.event_type,
                event_data=event.event_data,
                created_at=event.created_at.isoformat() if event.created_at else "",
            )
            for event in events
        ],
    )
