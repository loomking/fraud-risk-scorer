"""
GET /report — Dashboard evaluation data (v2.0.1).

Returns metrics, PR curve operating points, and recent scored transactions.
"""

import json
import logging
from pathlib import Path

import joblib
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.schemas import ReportResponse
from src.config import MODEL_ARTIFACTS_DIR, FP_COST_INR, FN_COST_INR
from src.db.session import get_db
from src.db.models import Score, Transaction

logger = logging.getLogger(__name__)

router = APIRouter()

V2_DIR = MODEL_ARTIFACTS_DIR / "v2" / "v2.0.1"
V2_MODEL_VERSION = "v2.0.1"


@router.get("", response_model=ReportResponse)
def get_report(db: Session = Depends(get_db)):
    """Return evaluation data required by the dashboard."""
    # Load v2.0.1 metadata
    metadata_path = V2_DIR / "metadata.json"
    metrics = {}
    pr_curve = []
    sensitivity = []
    feature_count = 22
    threshold = 0.05

    if metadata_path.exists():
        with open(metadata_path) as f:
            metadata = json.load(f)
            metrics = {
                "roc_auc": metadata.get("roc_auc", 0),
                "pr_auc": metadata.get("pr_auc", 0),
            }
            pr_curve = metadata.get("pr_curve_results", [])
            feature_count = metadata.get("n_features", 22)

    # Calculate total score events
    total_scored = db.query(Score).count()

    # Recent scored transactions (all events, not deduplicated)
    recent_scores = db.query(Score).order_by(Score.created_at.desc()).limit(50).all()
    recent_transactions = []
    for s in recent_scores:
        txn = db.query(Transaction).filter(
            Transaction.transaction_id == s.transaction_id
        ).first()
        amt = txn.raw_data.get("TransactionAmt", 0) if txn and txn.raw_data else 0
        recent_transactions.append({
            "transaction_id": s.transaction_id,
            "risk_probability": s.calibrated_probability,
            "threshold": s.threshold,
            "decision": s.decision,
            "model_version": s.model_version,
            "amount": amt,
            "created_at": s.created_at.isoformat() if s.created_at else "",
        })

    return ReportResponse(
        model_version=V2_MODEL_VERSION,
        feature_count=feature_count,
        threshold=threshold,
        fp_cost_assumption=FP_COST_INR,
        fn_cost_assumption=FN_COST_INR,
        total_scored=total_scored,
        metrics=metrics,
        sensitivity=sensitivity,
        pr_curve=pr_curve,
        recent_transactions=recent_transactions,
    )
