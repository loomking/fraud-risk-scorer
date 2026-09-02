"""
v2.0.1 Investigation: Remove amt_is_round dominance, generate full PR curve.

1. Retrain with amt_is_round removed
2. Compare ROC-AUC/PR-AUC with vs without
3. Generate precision-recall curve at 10+ threshold points with review rate
4. Present 2-3 candidate operational thresholds
"""

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
    roc_auc_score, average_precision_score, precision_score,
    recall_score, f1_score, confusion_matrix, brier_score_loss,
    precision_recall_curve,
)

from src.config import (
    DATA_PROCESSED_DIR, MODEL_ARTIFACTS_DIR, FP_COST_INR, FN_COST_INR,
)
from src.data import (
    load_raw_data, join_transaction_identity, sort_by_time,
    temporal_split, verify_split_integrity,
)
from src.features.build_features_v2 import build_features_v2, FEATURE_COLUMNS_V2
from src.models.calibrate import calibrate_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

V2_DIR = MODEL_ARTIFACTS_DIR / "v2"

def run():
    # ── Load and split ────────────────────────────────────────────────────
    df_txn, df_id = load_raw_data()
    df = join_transaction_identity(df_txn, df_id)
    del df_txn, df_id
    df = sort_by_time(df)
    train_df, val_df, test_df = temporal_split(df)
    del df

    # ── Build v2 features ─────────────────────────────────────────────────
    logger.info("\n--- Building v2 features ---")
    train_feat, val_feat, test_feat, freq_maps, _ = build_features_v2(
        train_df, val_df, test_df
    )
    del train_df, val_df, test_df

    # ── Define feature sets ───────────────────────────────────────────────
    # Note: build_features_v2 natively returns a DataFrame with 23 features.
    # However, for the live v2.0.1 model, we explicitly slice out 3 features post-engineering:
    # 1. `amt_is_round` - highly dominant (0.34 importance) but flagged as an artifact of synthetic data generation.
    # 2. `dow_sin` & `dow_cos` - day-of-week alignment relies on an artificial dataset start-date anchor which we cannot safely project to real-world live data.
    # This explicit 23 -> 20 slice ensures the live model is robust and artifact-free.
    features_with = list(FEATURE_COLUMNS_V2)  # v2.0.0 (includes amt_is_round)
    features_without = [f for f in FEATURE_COLUMNS_V2 if f not in ("amt_is_round", "dow_sin", "dow_cos")]  # v2.0.1

    logger.info(f"  v2.0.0 features: {len(features_with)}")
    logger.info(f"  v2.0.1 features: {len(features_without)} (amt_is_round removed)")

    # ── Train v2.0.1 (without amt_is_round) ───────────────────────────────
    logger.info("\n" + "=" * 70)
    logger.info("TRAINING v2.0.1 (amt_is_round REMOVED)")
    logger.info("=" * 70)

    X_train = train_feat[features_without].values
    y_train = train_feat["isFraud"].values
    X_val = val_feat[features_without].values
    y_val = val_feat["isFraud"].values
    X_test = test_feat[features_without].values
    y_test = test_feat["isFraud"].values

    X_train = np.nan_to_num(X_train, nan=0.0, posinf=1e10, neginf=-1e10)
    X_val = np.nan_to_num(X_val, nan=0.0, posinf=1e10, neginf=-1e10)
    X_test = np.nan_to_num(X_test, nan=0.0, posinf=1e10, neginf=-1e10)

    n_neg = (y_train == 0).sum()
    n_pos = (y_train == 1).sum()
    scale_pos_weight = n_neg / n_pos

    model = xgb.XGBClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.05,
        scale_pos_weight=scale_pos_weight, subsample=0.8,
        colsample_bytree=0.8, min_child_weight=5,
        reg_alpha=0.1, reg_lambda=1.0, random_state=42,
        eval_metric="aucpr", early_stopping_rounds=50,
        n_jobs=-1, tree_method="hist",
    )
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=50)
    logger.info(f"  Best iteration: {model.best_iteration}")

    # ── Feature importance ────────────────────────────────────────────────
    logger.info("\n--- v2.0.1 Feature Importance ---")
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    fi_list = []
    for rank, idx in enumerate(indices, 1):
        fi_list.append({"rank": rank, "feature": features_without[idx],
                        "importance": float(importances[idx])})
        logger.info(f"  #{rank:2d}: {features_without[idx]:35s} {importances[idx]:.4f}")

    # ── Calibrate ─────────────────────────────────────────────────────────
    calibrated_model, cal_report = calibrate_model(model, val_feat, features_without)
    logger.info(f"  Brier improvement: {cal_report['brier_improvement']:.4f}")

    # ── Test set metrics (threshold-independent) ──────────────────────────
    y_proba_test = calibrated_model.predict_proba(X_test)[:, 1]
    roc_auc = roc_auc_score(y_test, y_proba_test)
    pr_auc = average_precision_score(y_test, y_proba_test)

    logger.info(f"\n{'='*70}")
    logger.info(f"v2.0.1 TEST SET (threshold-independent)")
    logger.info(f"{'='*70}")
    logger.info(f"  ROC-AUC: {roc_auc:.4f}")
    logger.info(f"  PR-AUC:  {pr_auc:.4f}")

    # Compare with v2.0.0
    logger.info(f"\n  COMPARISON:")
    logger.info(f"    v2.0.0 ROC-AUC: 0.8062 | v2.0.1 ROC-AUC: {roc_auc:.4f} | delta: {roc_auc - 0.8062:+.4f}")
    logger.info(f"    v2.0.0 PR-AUC:  0.1684 | v2.0.1 PR-AUC:  {pr_auc:.4f} | delta: {pr_auc - 0.1684:+.4f}")

    if abs(roc_auc - 0.8062) < 0.02 and abs(pr_auc - 0.1684) < 0.03:
        logger.info(f"  VERDICT: Performance barely changed. Other features carry real signal.")
    else:
        logger.info(f"  VERDICT: SIGNIFICANT CHANGE. Model was heavily dependent on amt_is_round.")

    # ── Full PR curve with operational metrics ────────────────────────────
    logger.info(f"\n{'='*70}")
    logger.info(f"PRECISION-RECALL CURVE (v2.0.1, Test Set)")
    logger.info(f"{'='*70}")

    # Generate at many threshold points
    thresholds_to_eval = np.concatenate([
        np.arange(0.001, 0.01, 0.001),
        np.arange(0.01, 0.05, 0.005),
        np.arange(0.05, 0.20, 0.01),
        np.arange(0.20, 0.50, 0.05),
        np.array([0.50, 0.60, 0.70, 0.80, 0.90]),
    ])

    n_total = len(y_test)
    n_fraud = y_test.sum()

    logger.info(f"\n  {'Threshold':>10} | {'Review%':>8} | {'Capture%':>9} | {'Precision%':>11} | {'TP':>5} | {'FP':>6} | {'FN':>4} | {'TN':>6}")
    logger.info(f"  {'-'*10}-+-{'-'*8}-+-{'-'*9}-+-{'-'*11}-+-{'-'*5}-+-{'-'*6}-+-{'-'*4}-+-{'-'*6}")

    results = []
    for t in thresholds_to_eval:
        y_pred = (y_proba_test >= t).astype(int)
        tp = int(((y_pred == 1) & (y_test == 1)).sum())
        fp = int(((y_pred == 1) & (y_test == 0)).sum())
        fn = int(((y_pred == 0) & (y_test == 1)).sum())
        tn = int(((y_pred == 0) & (y_test == 0)).sum())
        
        review_rate = (tp + fp) / n_total
        fraud_capture = tp / n_fraud if n_fraud > 0 else 0
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0

        results.append({
            "threshold": float(t),
            "review_rate": review_rate,
            "fraud_capture": fraud_capture,
            "precision": prec,
            "tp": tp, "fp": fp, "fn": fn, "tn": tn,
        })

        logger.info(f"  {t:10.4f} | {review_rate*100:7.1f}% | {fraud_capture*100:8.1f}% | {prec*100:10.1f}% | {tp:5d} | {fp:6d} | {fn:4d} | {tn:6d}")

    # ── Identify candidate thresholds in 10-20% review rate range ─────────
    logger.info(f"\n{'='*70}")
    logger.info(f"CANDIDATE OPERATIONAL THRESHOLDS (review rate 10-25%)")
    logger.info(f"{'='*70}")

    candidates = [r for r in results if 0.05 <= r["review_rate"] <= 0.30]
    if not candidates:
        logger.info("  No thresholds found in 5-30% review rate range.")
        logger.info("  Expanding search...")
        candidates = sorted(results, key=lambda r: abs(r["review_rate"] - 0.15))[:5]

    for r in candidates:
        fraud_missed = n_fraud - r["tp"]
        logger.info(f"\n  Threshold: {r['threshold']:.4f}")
        logger.info(f"    Review rate:    {r['review_rate']*100:.1f}%")
        logger.info(f"    Fraud capture:  {r['fraud_capture']*100:.1f}% ({r['tp']}/{int(n_fraud)} caught)")
        logger.info(f"    Fraud MISSED:   {fraud_missed} transactions")
        logger.info(f"    Precision:      {r['precision']*100:.1f}%")
        logger.info(f"    TN={r['tn']} FP={r['fp']} FN={r['fn']} TP={r['tp']}")

    # ── Save v2.0.1 artifacts ─────────────────────────────────────────────
    v201_dir = V2_DIR / "v2.0.1"
    v201_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, v201_dir / "xgboost_model.joblib")
    joblib.dump(calibrated_model, v201_dir / "calibrated_model.joblib")
    joblib.dump(features_without, v201_dir / "feature_columns.joblib")
    joblib.dump(freq_maps, v201_dir / "freq_maps.joblib")

    metadata = {
        "model_version": "v2.0.1",
        "removed_feature": "amt_is_round",
        "reason": "Dominant feature (0.34 importance) suspected as IEEE-CIS dataset artifact",
        "n_features": len(features_without),
        "feature_columns": features_without,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "feature_importance": fi_list,
        "calibration": cal_report,
        "pr_curve_results": results,
        "timestamp": datetime.utcnow().isoformat(),
    }
    with open(v201_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2, default=str)

    logger.info(f"\n  v2.0.1 artifacts saved to {v201_dir}/")
    logger.info(f"  DONE.")


if __name__ == "__main__":
    run()
