"""
Pipeline v2.0.0: Retrain from scratch with live-form features only.

Saves all artifacts to models/v2/ — does NOT overwrite v1.0.0.

Usage:
    .venv/Scripts/python.exe -m src.pipeline_v2 [--full]
"""

import argparse
import hashlib
import joblib
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    brier_score_loss,
)

from src.config import (
    DATA_PROCESSED_DIR, DATA_RAW_DIR, DEV_SUBSET_SIZE, MODEL_ARTIFACTS_DIR,
    FP_COST_INR, FN_COST_INR, PROJECT_ROOT,
)
from src.data import (
    load_raw_data, join_transaction_identity, sort_by_time,
    temporal_split, verify_split_integrity, get_dev_subset,
)
from src.features.build_features_v2 import build_features_v2, FEATURE_COLUMNS_V2
from src.models.calibrate import calibrate_model, save_calibration_artifacts
from src.models.threshold import (
    threshold_sweep, select_optimal_threshold, threshold_sensitivity_analysis,
    save_threshold_artifacts, compute_cost_at_threshold,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

V2_MODEL_VERSION = "v2.0.0"
V2_DIR = MODEL_ARTIFACTS_DIR / "v2"


def run_v2_pipeline(use_full_data: bool = False) -> dict:
    """Full v2 pipeline: data → features → train → calibrate → threshold → eval."""

    logger.info("=" * 70)
    logger.info("PIPELINE v2.0.0: LIVE-FORM FEATURES ONLY")
    logger.info("=" * 70)

    # ── Load data ─────────────────────────────────────────────────────────
    df_txn, df_id = load_raw_data()
    df = join_transaction_identity(df_txn, df_id)
    del df_txn, df_id
    df = sort_by_time(df)

    if not use_full_data:
        logger.info(f"\n--- Using dev subset (first {DEV_SUBSET_SIZE} rows) ---")
        df = get_dev_subset(df, n=DEV_SUBSET_SIZE)

    # ── Temporal split ────────────────────────────────────────────────────
    train_df, val_df, test_df = temporal_split(df)
    split_report = verify_split_integrity(train_df, val_df, test_df, len(df))
    del df

    # ── Feature engineering (v2) ──────────────────────────────────────────
    logger.info("\n--- v2 Feature Engineering (live-form fields only) ---")
    train_feat, val_feat, test_feat, freq_maps, feature_columns = build_features_v2(
        train_df, val_df, test_df
    )
    del train_df, val_df, test_df

    logger.info(f"  Feature columns ({len(feature_columns)}): {feature_columns}")

    # Verify zero V-columns
    v_cols = [c for c in feature_columns if c.startswith("V") and c[1:].isdigit()]
    if v_cols:
        raise AssertionError(f"FATAL: V-columns leaked into v2 feature set: {v_cols}")
    logger.info("  ✓ CONFIRMED: Zero V-columns in feature set")

    # ── Save artifacts dir ────────────────────────────────────────────────
    V2_DIR.mkdir(parents=True, exist_ok=True)

    # Save frequency maps
    joblib.dump(freq_maps, V2_DIR / "freq_maps_v2.joblib")
    joblib.dump(feature_columns, V2_DIR / "feature_columns_v2.joblib")

    # ── Train XGBoost ─────────────────────────────────────────────────────
    logger.info("\n--- Training XGBoost v2 ---")
    X_train = train_feat[feature_columns].values
    y_train = train_feat["isFraud"].values
    X_val = val_feat[feature_columns].values
    y_val = val_feat["isFraud"].values

    X_train = np.nan_to_num(X_train, nan=0.0, posinf=1e10, neginf=-1e10)
    X_val = np.nan_to_num(X_val, nan=0.0, posinf=1e10, neginf=-1e10)

    n_neg = (y_train == 0).sum()
    n_pos = (y_train == 1).sum()
    scale_pos_weight = n_neg / n_pos if n_pos > 0 else 1.0

    logger.info(f"  Class distribution: {n_neg} neg / {n_pos} pos "
                f"(ratio: {n_neg/n_pos:.1f}:1, scale_pos_weight={scale_pos_weight:.2f})")

    model = xgb.XGBClassifier(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=scale_pos_weight,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        eval_metric="aucpr",
        early_stopping_rounds=50,
        n_jobs=-1,
        tree_method="hist",
    )

    logger.info(f"  Training on {X_train.shape[0]} samples, {X_train.shape[1]} features...")
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=50)
    logger.info(f"  Best iteration: {model.best_iteration}")
    logger.info(f"  Best validation score: {model.best_score:.4f}")

    # ── Feature importance ────────────────────────────────────────────────
    logger.info("\n--- Feature Importance (v2) ---")
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    feature_importance = []
    for rank, idx in enumerate(indices, 1):
        fi = {"rank": rank, "feature": feature_columns[idx], "importance": float(importances[idx])}
        feature_importance.append(fi)
        logger.info(f"  #{rank:2d}: {feature_columns[idx]:35s} {importances[idx]:.4f}")

    # ── Calibration ───────────────────────────────────────────────────────
    logger.info("\n--- Probability Calibration (v2) ---")

    # Use the existing calibrate_model function (isotonic regression on val predictions)
    calibrated_model, calibration_report = calibrate_model(model, val_feat, feature_columns)

    joblib.dump(calibrated_model, V2_DIR / "calibrated_model_v2.joblib")
    with open(V2_DIR / "calibration_report_v2.json", "w") as f:
        json.dump(calibration_report, f, indent=2)

    # ── Threshold Selection ───────────────────────────────────────────────
    logger.info("\n--- Cost-Based Threshold Selection (v2, on VALIDATION data) ---")
    y_proba_val = calibrated_model.predict_proba(X_val)[:, 1]

    sweep_results = threshold_sweep(y_val, y_proba_val)
    optimal = select_optimal_threshold(sweep_results)

    logger.info(f"  OPTIMAL THRESHOLD: {optimal['threshold']:.4f}")
    logger.info(f"    Review rate:  {optimal['review_rate']:.3f}")
    logger.info(f"    Fraud capture: {optimal['fraud_capture']:.3f}")
    logger.info(f"    Cost/1000:    ₹{optimal['cost_per_1000_txns']:.0f}")

    # Sensitivity
    sensitivity = threshold_sensitivity_analysis(y_val, y_proba_val)

    # Save threshold artifacts to v2 dir
    threshold_data = {
        "optimal_threshold": optimal,
        "fp_cost_inr": FP_COST_INR,
        "fn_cost_inr": FN_COST_INR,
    }
    with open(V2_DIR / "threshold_config_v2.json", "w") as f:
        json.dump(threshold_data, f, indent=2)

    frozen_threshold = optimal["threshold"]

    # ── Test Evaluation ───────────────────────────────────────────────────
    logger.info(f"\n--- Evaluating on UNTOUCHED TEST SET (threshold={frozen_threshold:.4f}) ---")
    X_test = test_feat[feature_columns].values
    y_test = test_feat["isFraud"].values
    X_test = np.nan_to_num(X_test, nan=0.0, posinf=1e10, neginf=-1e10)

    y_proba_test = calibrated_model.predict_proba(X_test)[:, 1]
    y_pred_test = (y_proba_test >= frozen_threshold).astype(int)

    roc_auc = roc_auc_score(y_test, y_proba_test)
    pr_auc = average_precision_score(y_test, y_proba_test)
    precision = precision_score(y_test, y_pred_test, zero_division=0)
    recall_val = recall_score(y_test, y_pred_test, zero_division=0)
    f1_val = f1_score(y_test, y_pred_test, zero_division=0)
    brier = brier_score_loss(y_test, y_proba_test)
    cm = confusion_matrix(y_test, y_pred_test)

    test_metrics = {
        "split": "TEST",
        "model": "XGBoost",
        "model_version": V2_MODEL_VERSION,
        "roc_auc": float(roc_auc),
        "pr_auc": float(pr_auc),
        "precision": float(precision),
        "recall": float(recall_val),
        "f1": float(f1_val),
        "brier_score": float(brier),
        "threshold": float(frozen_threshold),
        "confusion_matrix": cm.tolist(),
        "total_samples": int(len(y_test)),
        "positive_samples": int(y_test.sum()),
        "negative_samples": int(len(y_test) - y_test.sum()),
    }

    test_cost = compute_cost_at_threshold(y_test, y_proba_test, frozen_threshold)

    logger.info(f"\n{'='*60}")
    logger.info(f"  TEST EVALUATION — XGBoost v2 (threshold={frozen_threshold:.4f})")
    logger.info(f"{'='*60}")
    logger.info(f"  ROC-AUC:   {roc_auc:.4f}")
    logger.info(f"  PR-AUC:    {pr_auc:.4f}")
    logger.info(f"  Precision: {precision:.4f}")
    logger.info(f"  Recall:    {recall_val:.4f}")
    logger.info(f"  F1:        {f1_val:.4f}")
    logger.info(f"  Brier:     {brier:.4f}")
    logger.info(f"  Confusion Matrix:")
    logger.info(f"    TN={cm[0][0]}  FP={cm[0][1]}")
    logger.info(f"    FN={cm[1][0]}  TP={cm[1][1]}")

    # ── Save model artifacts ──────────────────────────────────────────────
    model_path = V2_DIR / "xgboost_model_v2.joblib"
    joblib.dump(model, model_path)

    model_bytes = model_path.read_bytes()
    model_hash = hashlib.sha256(model_bytes).hexdigest()[:12]

    metadata = {
        "model_version": V2_MODEL_VERSION,
        "model_hash": model_hash,
        "timestamp": datetime.utcnow().isoformat(),
        "n_features": len(feature_columns),
        "feature_columns": feature_columns,
        "best_iteration": int(model.best_iteration),
        "metrics": test_metrics,
        "feature_importance": feature_importance,
        "calibration": calibration_report,
        "threshold": optimal,
        "sensitivity": sensitivity,
        "split_report": split_report,
        "test_cost": test_cost,
        "v_columns_used": 0,
        "ieee_cis_only_columns_used": [],
    }

    with open(V2_DIR / "metadata_v2.json", "w") as f:
        json.dump(metadata, f, indent=2, default=str)

    # ── Summary ───────────────────────────────────────────────────────────
    logger.info("\n" + "=" * 70)
    logger.info("PIPELINE v2.0.0 COMPLETE")
    logger.info("=" * 70)
    logger.info(f"  Data: {'FULL' if use_full_data else f'DEV SUBSET ({DEV_SUBSET_SIZE} rows)'}")
    logger.info(f"  Features: {len(feature_columns)} columns")
    logger.info(f"  V-columns used: 0")
    logger.info(f"  XGBoost Test ROC-AUC: {roc_auc:.4f}")
    logger.info(f"  XGBoost Test PR-AUC:  {pr_auc:.4f}")
    logger.info(f"  Frozen Threshold:     {frozen_threshold:.4f}")
    logger.info(f"  Test Fraud Capture:   {test_cost['fraud_capture']:.3f}")
    logger.info(f"  Test Review Rate:     {test_cost['review_rate']:.3f}")
    logger.info(f"  Test Cost/1000:       ₹{test_cost['cost_per_1000_txns']:.0f}")
    logger.info(f"  Artifacts saved to:   {V2_DIR}/")

    return {
        "test_metrics": test_metrics,
        "threshold": frozen_threshold,
        "test_cost": test_cost,
        "model_hash": model_hash,
        "feature_count": len(feature_columns),
        "feature_columns": feature_columns,
        "feature_importance": feature_importance,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipeline v2.0.0: Live-form features")
    parser.add_argument("--full", action="store_true", help="Use full dataset")
    args = parser.parse_args()

    result = run_v2_pipeline(use_full_data=args.full)
