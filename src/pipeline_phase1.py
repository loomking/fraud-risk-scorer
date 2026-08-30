"""
Phase 1 Runner: Data loading → Validation → Split → Features → Baseline.

Usage:
    uv run python -m src.pipeline_phase1 [--full]

Default: runs on dev subset (first 30k rows by TransactionDT).
With --full: runs on the complete dataset.
"""

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np

from src.config import DATA_PROCESSED_DIR, DEV_SUBSET_SIZE, MODEL_ARTIFACTS_DIR
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
from src.models.train_baseline import evaluate_model, save_baseline_artifacts, train_baseline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def run_phase1(use_full_data: bool = False) -> dict:
    """Execute the complete Phase 1 pipeline."""

    # ── Step 1: Load and validate raw data ────────────────────────────────
    logger.info("=" * 70)
    logger.info("PHASE 1: DATA + BASELINE")
    logger.info("=" * 70)

    df_txn, df_id = load_raw_data()

    # ── Step 2: Join identity data ────────────────────────────────────────
    logger.info("\n--- Identity join ---")
    df = join_transaction_identity(df_txn, df_id)
    del df_txn, df_id  # Free memory

    # ── Step 3: Sort by TransactionDT (Section 8) ─────────────────────────
    logger.info("\n--- Sorting by TransactionDT ---")
    df = sort_by_time(df)

    # ── Step 4: Dev subset (Section 4.3) ──────────────────────────────────
    if not use_full_data:
        logger.info(f"\n--- Using dev subset (first {DEV_SUBSET_SIZE} rows) ---")
        df = get_dev_subset(df, n=DEV_SUBSET_SIZE)

    # ── Step 5: Temporal split (Section 9) ────────────────────────────────
    logger.info("\n--- Temporal split (70/15/15) ---")
    train_df, val_df, test_df = temporal_split(df)

    # ── CHECKPOINT 1: Split verification ──────────────────────────────────
    logger.info("\n" + "=" * 70)
    logger.info("CHECKPOINT 1: SPLIT VERIFICATION")
    logger.info("=" * 70)
    split_report = verify_split_integrity(train_df, val_df, test_df, len(df))
    for k, v in split_report.items():
        logger.info(f"  {k}: {v}")

    # Verify no random splitting
    assert split_report["no_overlap_train_val"], "FAIL: train/val overlap"
    assert split_report["no_overlap_val_test"], "FAIL: val/test overlap"
    assert split_report["rows_accounted"] == split_report["total_rows"], "FAIL: row count mismatch"
    logger.info("  ✓ All Checkpoint 1 checks passed")

    # ── Step 6: Feature engineering ───────────────────────────────────────
    logger.info("\n--- Feature engineering ---")
    train_feat, val_feat, test_feat, freq_encoder, feature_columns = build_features(
        train_df, val_df, test_df
    )

    # Save splits for reproducibility
    save_splits(train_feat, val_feat, test_feat)

    # ── Step 7: Baseline model (Section 13.1) ─────────────────────────────
    logger.info("\n--- Baseline: Logistic Regression ---")
    model, scaler = train_baseline(train_feat, feature_columns)

    # ── CHECKPOINT 2: Baseline evaluation ─────────────────────────────────
    logger.info("\n" + "=" * 70)
    logger.info("CHECKPOINT 2: BASELINE EVALUATION")
    logger.info("=" * 70)

    val_metrics = evaluate_model(
        model, scaler, val_feat, feature_columns,
        split_name="VALIDATION", threshold=0.5,
    )

    # Leakage detection (Section 13.1)
    if val_metrics["roc_auc"] > 0.95:
        logger.error(
            "⚠⚠⚠ LEAKAGE ALERT: Baseline ROC-AUC > 0.95! "
            "This is suspiciously high for Logistic Regression. "
            "INVESTIGATE before proceeding to Phase 2."
        )
    else:
        logger.info(f"  ✓ Baseline ROC-AUC = {val_metrics['roc_auc']:.4f} (< 0.95, no leakage signal)")

    # Save baseline artifacts
    save_baseline_artifacts(model, scaler, val_metrics, feature_columns)

    # ── Summary ───────────────────────────────────────────────────────────
    logger.info("\n" + "=" * 70)
    logger.info("PHASE 1 COMPLETE")
    logger.info("=" * 70)
    logger.info(f"  Data: {'FULL' if use_full_data else f'DEV SUBSET ({DEV_SUBSET_SIZE} rows)'}")
    logger.info(f"  Features: {len(feature_columns)} columns")
    logger.info(f"  Baseline ROC-AUC: {val_metrics['roc_auc']:.4f}")
    logger.info(f"  Baseline PR-AUC:  {val_metrics['pr_auc']:.4f}")

    return {
        "split_report": split_report,
        "val_metrics": val_metrics,
        "feature_count": len(feature_columns),
        "feature_columns": feature_columns,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Phase 1: Data + Baseline")
    parser.add_argument("--full", action="store_true", help="Use full dataset (not dev subset)")
    args = parser.parse_args()

    result = run_phase1(use_full_data=args.full)
