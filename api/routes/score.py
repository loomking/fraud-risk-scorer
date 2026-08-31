"""
POST /score — Transaction scoring endpoint (Section 28.1).

Backend owns feature engineering, model inference, calibration, thresholding.
Client never generates ML features.
"""

import hashlib
import json
import logging
from datetime import datetime

import numpy as np
import joblib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.schemas import ScoreRequest, ScoreResponse
from src.config import (
    MODEL_ARTIFACTS_DIR,
    MODEL_VERSION,
    CALIBRATION_VERSION,
    FEATURE_PIPELINE_VERSION,
    THRESHOLD_CONFIG_VERSION,
    FP_COST_INR,
    FN_COST_INR,
)
from src.db.session import get_db
from src.db.models import Transaction, Score, AuditLog

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Load model artifacts on startup ───────────────────────────────────────────
_model = None
_feature_columns = None
_threshold = None


def _load_artifacts():
    global _model, _feature_columns, _threshold
    if _model is None:
        _model = joblib.load(MODEL_ARTIFACTS_DIR / "calibrated_model.joblib")
        _feature_columns = joblib.load(MODEL_ARTIFACTS_DIR / "xgboost_feature_columns.joblib")
        with open(MODEL_ARTIFACTS_DIR / "threshold_config.json") as f:
            config = json.load(f)
            _threshold = config["optimal_threshold"]["threshold"]
        logger.info(f"Model artifacts loaded. Threshold: {_threshold:.4f}")
    return _model, _feature_columns, _threshold


@router.post("", response_model=ScoreResponse)
def score_transaction(request: ScoreRequest, db: Session = Depends(get_db)):
    """
    Score a transaction for fraud risk.

    Pipeline: Input → Feature Vector → Model → Calibration → Threshold → PASS/FLAG
    """
    model, feature_columns, threshold = _load_artifacts()

    # Convert request to dict
    txn_data = request.model_dump()

    # Build minimal feature vector from the request data
    # In production this would run the full feature pipeline.
    # For the API, we build a zero-filled vector with available fields.
    feature_vector = np.zeros(len(feature_columns))
    for i, col in enumerate(feature_columns):
        if col in txn_data and txn_data[col] is not None:
            try:
                feature_vector[i] = float(txn_data[col])
            except (ValueError, TypeError):
                pass

    # Special derived features
    col_map = {c: i for i, c in enumerate(feature_columns)}
    if "amt_log" in col_map:
        feature_vector[col_map["amt_log"]] = np.log1p(request.TransactionAmt)
    if "amt_decimal" in col_map:
        feature_vector[col_map["amt_decimal"]] = request.TransactionAmt - int(request.TransactionAmt)
    if "amt_is_round" in col_map:
        decimal = request.TransactionAmt - int(request.TransactionAmt)
        feature_vector[col_map["amt_is_round"]] = 1.0 if decimal < 0.01 else 0.0
    if "has_identity" in col_map:
        feature_vector[col_map["has_identity"]] = 1.0 if request.DeviceType else 0.0

    # Handle NaN/inf
    feature_vector = np.nan_to_num(feature_vector, nan=0.0, posinf=1e10, neginf=-1e10)

    # Score
    X = feature_vector.reshape(1, -1)
    risk_probability = float(model.predict_proba(X)[0, 1])
    decision = "FLAG" if risk_probability >= threshold else "PASS"

    # Feature hash for reconstructability
    feature_hash = hashlib.sha256(feature_vector.tobytes()).hexdigest()[:12]

    # Persist to database
    # Transaction record — upsert (re-scoring same transaction is allowed)
    existing_txn = db.query(Transaction).filter_by(transaction_id=request.TransactionID).first()
    if existing_txn:
        existing_txn.raw_data = txn_data
    else:
        db.add(Transaction(transaction_id=request.TransactionID, raw_data=txn_data))

    # Score record
    db_score = Score(
        transaction_id=request.TransactionID,
        model_version=MODEL_VERSION,
        feature_pipeline_version=FEATURE_PIPELINE_VERSION,
        calibration_version=CALIBRATION_VERSION,
        threshold_config_version=THRESHOLD_CONFIG_VERSION,
        risk_score=risk_probability,  # Using calibrated as primary
        calibrated_probability=risk_probability,
        threshold=threshold,
        fp_cost_assumption=FP_COST_INR,
        fn_cost_assumption=FN_COST_INR,
        decision=decision,
        feature_hash=feature_hash,
    )
    db.add(db_score)

    # Audit log
    db.add(AuditLog(
        transaction_id=request.TransactionID,
        event_type="score_computed",
        event_data={
            "risk_probability": risk_probability,
            "threshold": threshold,
            "model_version": MODEL_VERSION,
            "feature_hash": feature_hash,
        },
    ))
    db.add(AuditLog(
        transaction_id=request.TransactionID,
        event_type="decision_made",
        event_data={
            "decision": decision,
            "risk_probability": risk_probability,
            "threshold": threshold,
        },
    ))

    db.commit()

    return ScoreResponse(
        transaction_id=request.TransactionID,
        risk_probability=round(risk_probability, 6),
        threshold=round(threshold, 6),
        decision=decision,
        model_version=MODEL_VERSION,
        calibration_version=CALIBRATION_VERSION,
        feature_pipeline_version=FEATURE_PIPELINE_VERSION,
        threshold_config_version=THRESHOLD_CONFIG_VERSION,
    )
