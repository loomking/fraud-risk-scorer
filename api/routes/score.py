"""
POST /score — Transaction scoring endpoint (v2.0.1).

Computes the full 22-feature vector from 7 raw input fields using
pre-trained frequency maps and encodings. No V-columns.
"""

import hashlib
import json
import logging
import math
from datetime import datetime

import numpy as np
import joblib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.schemas import ScoreRequest, ScoreResponse
from src.config import (
    MODEL_ARTIFACTS_DIR,
    FP_COST_INR,
    FN_COST_INR,
)
from src.db.session import get_db
from src.db.models import Transaction, Score, AuditLog

logger = logging.getLogger(__name__)

router = APIRouter()

# ── v2.0.1 constants ─────────────────────────────────────────────────────────
V2_DIR = MODEL_ARTIFACTS_DIR / "v2" / "v2.0.1"
V2_MODEL_VERSION = "v2.0.1"
V2_FEATURE_PIPELINE_VERSION = "v2.0.1"
V2_CALIBRATION_VERSION = "v2.0.1"
V2_THRESHOLD_CONFIG_VERSION = "v2.0.1"
DEFAULT_THRESHOLD = 0.05  # Option B: 17.8% review, 61.4% capture

SECONDS_PER_HOUR = 3600
SECONDS_PER_DAY = 86400

FREE_MAIL_PROVIDERS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
    "mail.com", "ymail.com", "live.com", "msn.com", "protonmail.com",
    "icloud.com", "comcast.net", "att.net", "verizon.net", "sbcglobal.net",
    "cox.net", "charter.net", "earthlink.net", "juno.com", "bellsouth.net",
    "yahoo.com.mx", "yahoo.fr", "yahoo.es", "yahoo.de",
    "yahoo.co.uk", "yahoo.co.jp", "netzero.net", "aim.com", "rocketmail.com",
    "optonline.net", "frontier.com", "frontiernet.net", "windstream.net",
    "netzero.com", "centurylink.net",
}

# ── Load model artifacts on startup ───────────────────────────────────────────
_model = None
_feature_columns = None
_freq_maps = None


def _load_artifacts():
    global _model, _feature_columns, _freq_maps
    if _model is None:
        _model = joblib.load(V2_DIR / "calibrated_model.joblib")
        _feature_columns = joblib.load(V2_DIR / "feature_columns.joblib")
        _freq_maps = joblib.load(V2_DIR / "freq_maps.joblib")
        logger.info(f"v2.0.1 artifacts loaded. Features: {len(_feature_columns)}, Default threshold: {DEFAULT_THRESHOLD}")
    return _model, _feature_columns, _freq_maps


def _build_v2_feature_vector(txn_data: dict, feature_columns: list, freq_maps: dict) -> tuple[np.ndarray, dict]:
    """
    Build the full 22-feature vector from raw form fields.
    
    Uses the same logic as build_features_v2.py but for a single transaction.
    Frequency maps are pre-computed from training data.
    """
    amt = float(txn_data.get("TransactionAmt", 0))
    dt = float(txn_data.get("TransactionDT", 0))
    card1 = txn_data.get("card1")
    card4 = str(txn_data.get("card4", "__MISSING__") or "__MISSING__")
    card6 = str(txn_data.get("card6", "__MISSING__") or "__MISSING__")
    product_cd = str(txn_data.get("ProductCD", "__MISSING__") or "__MISSING__")
    email = str(txn_data.get("P_emaildomain", "__MISSING__") or "__MISSING__")

    features = {}

    # ── Group 1: Time features ────────────────────────────────────────────
    hour_of_day = (dt % SECONDS_PER_DAY) / SECONDS_PER_HOUR
    features["hour_sin"] = math.sin(2 * math.pi * hour_of_day / 24)
    features["hour_cos"] = math.cos(2 * math.pi * hour_of_day / 24)

    day_of_week = (dt % (7 * SECONDS_PER_DAY)) / SECONDS_PER_DAY
    features["dow_sin"] = math.sin(2 * math.pi * day_of_week / 7)
    features["dow_cos"] = math.cos(2 * math.pi * day_of_week / 7)

    # For single-transaction scoring, we don't have history context
    # These default to "first transaction for this card" values
    features["time_since_last_card1"] = -1.0  # sentinel: no prior txn
    features["card1_cum_count"] = 0.0
    features["card1_txn_count_1h"] = 0.0
    features["card1_txn_count_24h"] = 0.0
    features["card1_txn_count_7d"] = 0.0

    # ── Group 2: Amount features ──────────────────────────────────────────
    features["amt_log"] = math.log1p(amt)
    features["amt_decimal"] = amt - int(amt)

    # amt_deviation_from_card1: how far is this amount from card1's historical mean
    card1_stats = freq_maps.get("card1_amt_stats", {})
    global_mean = freq_maps.get("global_amt_mean", 100.0)
    global_std = freq_maps.get("global_amt_std", 200.0)
    if card1 is not None and card1 in card1_stats:
        c1_mean = card1_stats[card1]["mean"]
        c1_std = card1_stats[card1]["std"]
        if c1_std is None or c1_std == 0 or (isinstance(c1_std, float) and math.isnan(c1_std)):
            c1_std = 1.0
        features["amt_deviation_from_card1"] = (amt - c1_mean) / c1_std
    else:
        features["amt_deviation_from_card1"] = (amt - global_mean) / global_std

    # ── Group 3: Card features ────────────────────────────────────────────
    features["card1_freq"] = freq_maps["card1_freq"].get(card1, 0.0) if card1 is not None else 0.0

    combo_key = f"{card4}_{card6}"
    features["card4_card6_combo_freq"] = freq_maps["card4_card6_combo_freq"].get(combo_key, 0.0)

    cp_key = f"{card1}_{product_cd}" if card1 is not None else f"None_{product_cd}"
    features["card1_productcd_freq"] = freq_maps["card1_productcd_freq"].get(cp_key, 0.0)

    features["card4_encoded"] = float(freq_maps["card4_cat_map"].get(card4, -1))
    features["card6_encoded"] = float(freq_maps["card6_cat_map"].get(card6, -1))
    features["ProductCD_encoded"] = float(freq_maps["ProductCD_cat_map"].get(product_cd, -1))

    # ── Group 4: Email features ───────────────────────────────────────────
    features["email_freq"] = freq_maps["email_freq"].get(email, 0.0)
    features["is_free_email"] = 1.0 if email.lower() in FREE_MAIL_PROVIDERS else 0.0

    # ── Group 5: Cross features ───────────────────────────────────────────
    ce_key = f"{card1}_{email}" if card1 is not None else f"None_{email}"
    features["card1_email_cooccurrence"] = freq_maps["card1_email_cooccurrence_freq"].get(ce_key, 0.0)

    # Amount vs ProductCD typical range
    pcd_stats = freq_maps.get("pcd_amt_stats", {})
    if product_cd in pcd_stats:
        pcd_mean = pcd_stats[product_cd]["pcd_amt_mean"]
        pcd_std = pcd_stats[product_cd]["pcd_amt_std"]
        if pcd_std == 0:
            pcd_std = 1.0
        features["amt_vs_productcd"] = (amt - pcd_mean) / pcd_std
    else:
        features["amt_vs_productcd"] = (amt - global_mean) / global_std

    # ── Assemble vector in correct column order ───────────────────────────
    vec = np.zeros(len(feature_columns))
    for i, col in enumerate(feature_columns):
        val = features.get(col, 0.0)
        vec[i] = val
        features[col] = val

    return np.nan_to_num(vec, nan=0.0, posinf=1e10, neginf=-1e10), features


@router.post("", response_model=ScoreResponse)
def score_transaction(request: ScoreRequest, db: Session = Depends(get_db)):
    """
    Score a transaction for fraud risk using v2.0.1 (22 live-form features).
    """
    model, feature_columns, freq_maps = _load_artifacts()

    txn_data = request.model_dump()

    # Build v2.0.1 feature vector from raw fields
    feature_vector, features_dict = _build_v2_feature_vector(txn_data, feature_columns, freq_maps)

    # Score
    X = feature_vector.reshape(1, -1)
    risk_probability = float(model.predict_proba(X)[0, 1])

    # Use threshold from query param or default
    threshold = DEFAULT_THRESHOLD
    decision = "FLAG" if risk_probability >= threshold else "PASS"

    # Feature hash for reconstructability
    feature_hash = hashlib.sha256(feature_vector.tobytes()).hexdigest()[:12]

    # Persist to database
    existing_txn = db.query(Transaction).filter_by(transaction_id=request.TransactionID).first()
    if existing_txn:
        existing_txn.raw_data = txn_data
    else:
        db.add(Transaction(transaction_id=request.TransactionID, raw_data=txn_data))

    db_score = Score(
        transaction_id=request.TransactionID,
        model_version=V2_MODEL_VERSION,
        feature_pipeline_version=V2_FEATURE_PIPELINE_VERSION,
        calibration_version=V2_CALIBRATION_VERSION,
        threshold_config_version=V2_THRESHOLD_CONFIG_VERSION,
        risk_score=risk_probability,
        calibrated_probability=risk_probability,
        threshold=threshold,
        fp_cost_assumption=FP_COST_INR,
        fn_cost_assumption=FN_COST_INR,
        decision=decision,
        feature_hash=feature_hash,
    )
    db.add(db_score)

    db.add(AuditLog(
        transaction_id=request.TransactionID,
        event_type="score_computed",
        event_data={
            "risk_probability": risk_probability,
            "threshold": threshold,
            "model_version": V2_MODEL_VERSION,
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
        risk_probability=risk_probability,
        threshold=threshold,
        decision=decision,
        model_version=V2_MODEL_VERSION,
        calibration_version=V2_CALIBRATION_VERSION,
        feature_pipeline_version=V2_FEATURE_PIPELINE_VERSION,
        threshold_config_version=V2_THRESHOLD_CONFIG_VERSION,
    )
