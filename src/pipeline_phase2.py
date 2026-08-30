"""
Phase 2 Runner: XGBoost → Calibration → Threshold → Final Evaluation.

Usage:
    uv run python -m src.pipeline_phase2 [--full]
"""

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np

from src.config import DATA_PROCESSED_DIR, DEV_SUBSET_SIZE, MODEL_ARTIFACTS_DIR, FP_COST_INR, FN_COST_INR
from src.data import (
    get_dev_subset,
    join_transaction_identity,
    load_raw_data,
    save_splits,
    sort_by_time,
    temporal_split,
    verify_split_integrity,
)
from src.features.build_features import build_features
from src.models.train_model import (
    train_xgboost,
    evaluate_xgboost,
    get_feature_importance,
    save_xgboost_artifacts,
)
from src.models.calibrate import calibrate_model, save_calibration_artifacts
from src.models.threshold import (
    threshold_sweep,
    select_optimal_threshold,
    threshold_sensitivity_analysis,
    save_threshold_artifacts,
    compute_cost_at_threshold,
)
from src.models.evaluate import generate_eval_report

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def run_phase2(use_full_data: bool = False) -> dict:
    """Execute Phases 1+2: full pipeline from data to final evaluation."""

    logger.info("=" * 70)
    logger.info("PHASE 2: MAIN MODEL + CALIBRATION + THRESHOLD")
    logger.info("=" * 70)

    # ── Load data ─────────────────────────────────────────────────────────
    df_txn, df_id = load_raw_data()
    df = join_transaction_identity(df_txn, df_id)
    del df_txn, df_id
    df = sort_by_time(df)

    if not use_full_data:
        logger.info(f"\n--- Using dev subset (first {DEV_SUBSET_SIZE} rows) ---")
        df = get_dev_subset(df, n=DEV_SUBSET_SIZE)

    # ── Split ─────────────────────────────────────────────────────────────
    train_df, val_df, test_df = temporal_split(df)
    split_report = verify_split_integrity(train_df, val_df, test_df, len(df))

    # ── Features ──────────────────────────────────────────────────────────
    logger.info("\n--- Feature engineering ---")
    train_feat, val_feat, test_feat, freq_encoder, feature_columns = build_features(
        train_df, val_df, test_df
    )
    save_splits(train_feat, val_feat, test_feat)

    # ── Train XGBoost ─────────────────────────────────────────────────────
    logger.info("\n--- Training XGBoost ---")
    model = train_xgboost(train_feat, val_feat, feature_columns)

    # ── Feature importance ────────────────────────────────────────────────
    logger.info("\n--- Top 20 Feature Importance ---")
    feature_importance = get_feature_importance(model, feature_columns, top_n=20)

    # ── Calibration (Section 15) ──────────────────────────────────────────
    logger.info("\n--- Probability Calibration ---")
    calibrated_model, calibration_report = calibrate_model(model, val_feat, feature_columns)
    save_calibration_artifacts(calibrated_model, calibration_report)

    # ── Threshold Selection (Section 16) ──────────────────────────────────
    logger.info("\n--- Cost-Based Threshold Selection (on VALIDATION data) ---")
    X_val = val_feat[feature_columns].values
    y_val = val_feat["isFraud"].values
    X_val = np.nan_to_num(X_val, nan=0.0, posinf=1e10, neginf=-1e10)

    # Use calibrated model for probability estimates
    y_proba_val = calibrated_model.predict_proba(X_val)[:, 1]

    sweep_results = threshold_sweep(y_val, y_proba_val)
    optimal = select_optimal_threshold(sweep_results)

    logger.info(f"\n  OPTIMAL THRESHOLD: {optimal['threshold']:.4f}")
    logger.info(f"    Review rate:  {optimal['review_rate']:.3f}")
    logger.info(f"    Fraud capture: {optimal['fraud_capture']:.3f}")
    logger.info(f"    Cost/1000:    ₹{optimal['cost_per_1000_txns']:.0f}")

    # ── Threshold Sensitivity (Section 17) ────────────────────────────────
    logger.info("\n--- Threshold Sensitivity Analysis ---")
    sensitivity = threshold_sensitivity_analysis(y_val, y_proba_val)

    save_threshold_artifacts(optimal, sweep_results, sensitivity)

    # ── FREEZE threshold — now evaluate on TEST ───────────────────────────
    frozen_threshold = optimal["threshold"]
    logger.info(f"\n--- FROZEN threshold: {frozen_threshold:.4f} ---")
    logger.info(f"--- Evaluating on UNTOUCHED TEST SET ---")

    # Validation metrics (with frozen threshold)
    val_metrics = evaluate_xgboost(
        calibrated_model, val_feat, feature_columns,
        split_name="VALIDATION", threshold=frozen_threshold,
    )

    # Test metrics (final, untouched)
    test_metrics = evaluate_xgboost(
        calibrated_model, test_feat, feature_columns,
        split_name="TEST", threshold=frozen_threshold,
    )

    # Test cost metrics
    X_test = test_feat[feature_columns].values
    y_test = test_feat["isFraud"].values
    X_test = np.nan_to_num(X_test, nan=0.0, posinf=1e10, neginf=-1e10)
    y_proba_test = calibrated_model.predict_proba(X_test)[:, 1]
    test_cost = compute_cost_at_threshold(y_test, y_proba_test, frozen_threshold)

    # ── Save model artifacts ──────────────────────────────────────────────
    model_hash = save_xgboost_artifacts(model, test_metrics, feature_columns, feature_importance)

    # ── Generate evaluation report (Section 18) ───────────────────────────
    logger.info("\n--- Generating Evaluation Report ---")
    generate_eval_report(
        val_metrics=val_metrics,
        test_metrics=test_metrics,
        feature_importance=feature_importance,
        threshold_config=optimal,
        sensitivity=sensitivity,
        calibration_report=calibration_report,
        feature_count=len(feature_columns),
        split_report=split_report,
    )

    # ── Summary ───────────────────────────────────────────────────────────
    logger.info("\n" + "=" * 70)
    logger.info("PHASE 2 COMPLETE")
    logger.info("=" * 70)
    logger.info(f"  Data: {'FULL' if use_full_data else f'DEV SUBSET ({DEV_SUBSET_SIZE} rows)'}")
    logger.info(f"  Features: {len(feature_columns)} columns")
    logger.info(f"  XGBoost Test ROC-AUC: {test_metrics['roc_auc']:.4f}")
    logger.info(f"  XGBoost Test PR-AUC:  {test_metrics['pr_auc']:.4f}")
    logger.info(f"  Frozen Threshold:     {frozen_threshold:.4f}")
    logger.info(f"  Test Fraud Capture:   {test_cost['fraud_capture']:.3f}")
    logger.info(f"  Test Review Rate:     {test_cost['review_rate']:.3f}")
    logger.info(f"  Test Cost/1000:       ₹{test_cost['cost_per_1000_txns']:.0f}")

    return {
        "split_report": split_report,
        "val_metrics": val_metrics,
        "test_metrics": test_metrics,
        "threshold": frozen_threshold,
        "test_cost": test_cost,
        "model_hash": model_hash,
        "feature_count": len(feature_columns),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Phase 2: Main Model")
    parser.add_argument("--full", action="store_true", help="Use full dataset")
    args = parser.parse_args()

    result = run_phase2(use_full_data=args.full)
