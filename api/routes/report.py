"""
GET /report — Dashboard evaluation data (Section 28.4).

Returns metrics, sensitivity analysis, and recent scored transactions.
"""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.schemas import ReportResponse
from src.config import MODEL_ARTIFACTS_DIR, MODEL_VERSION, FP_COST_INR, FN_COST_INR
from src.db.session import get_db
from src.db.models import Score, Transaction

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=ReportResponse)
def get_report(db: Session = Depends(get_db)):
    """Return evaluation data required by the dashboard."""
    # Load model metadata
    metadata_path = MODEL_ARTIFACTS_DIR / "xgboost_metadata.json"
    metrics = {}
    if metadata_path.exists():
        with open(metadata_path) as f:
            metadata = json.load(f)
            metrics = metadata.get("metrics", {})

    # Load threshold config
    threshold_path = MODEL_ARTIFACTS_DIR / "threshold_config.json"
    threshold = 0.0
    sensitivity = []
    if threshold_path.exists():
        with open(threshold_path) as f:
            config = json.load(f)
            threshold = config.get("optimal_threshold", {}).get("threshold", 0.0)
            sensitivity = config.get("sensitivity_analysis", [])

    # Load feature columns count
    feature_count = 0
    try:
        import joblib
        cols = joblib.load(MODEL_ARTIFACTS_DIR / "xgboost_feature_columns.joblib")
        feature_count = len(cols)
    except Exception:
        pass

    # Calculate total score events (not deduplicated)
    total_scored = db.query(Score).count()

    # Recent scored transactions (all events, not deduplicated by transaction_id)
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
        model_version=MODEL_VERSION,
        feature_count=feature_count,
        threshold=threshold,
        fp_cost_assumption=FP_COST_INR,
        fn_cost_assumption=FN_COST_INR,
        total_scored=total_scored,
        metrics=metrics,
        sensitivity=sensitivity,
        recent_transactions=recent_transactions,
    )
