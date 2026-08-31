"""
Baseline model: Logistic Regression (Section 13.1).

Purpose: sanity checking, benchmark comparison, leakage detection.
If ROC-AUC > ~0.95, stop and investigate leakage — do not celebrate.
"""

import logging
import json
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    brier_score_loss,
)
from sklearn.preprocessing import StandardScaler

from src.config import MODEL_ARTIFACTS_DIR, MODEL_VERSION

logger = logging.getLogger(__name__)


def train_baseline(
    train_df: pd.DataFrame,
    feature_columns: list[str],
    target_col: str = "isFraud",
) -> tuple[LogisticRegression, StandardScaler]:
    """
    Train Logistic Regression baseline with class weighting for imbalance.

    Uses class_weight='balanced' (Section 12) to handle ~3.5% fraud rate.
    Features are standardized for stable convergence.
    """
    X_train = train_df[feature_columns].values
    y_train = train_df[target_col].values

    # Handle any remaining NaN/inf
    X_train = np.nan_to_num(X_train, nan=0.0, posinf=1e10, neginf=-1e10)

    # Standardize features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)

    # Train with balanced class weights for ~3.5% positive rate
    model = LogisticRegression(
        class_weight="balanced",
        max_iter=1000,
        solver="lbfgs",
        random_state=42,
        n_jobs=-1,
    )

    logger.info(f"Training baseline LR on {X_train_scaled.shape[0]} samples, "
                f"{X_train_scaled.shape[1]} features...")
    model.fit(X_train_scaled, y_train)

    train_proba = model.predict_proba(X_train_scaled)[:, 1]
    train_auc = roc_auc_score(y_train, train_proba)
    logger.info(f"  Train ROC-AUC: {train_auc:.4f}")

    return model, scaler


def evaluate_model(
    model: LogisticRegression,
    scaler: StandardScaler,
    eval_df: pd.DataFrame,
    feature_columns: list[str],
    target_col: str = "isFraud",
    split_name: str = "VAL",
    threshold: float = 0.5,
) -> dict:
    """
    Evaluate a model on a given split. Reports all Checkpoint 2 metrics.

    Returns a dict with all metrics.
    """
    X = eval_df[feature_columns].values
    y = eval_df[target_col].values

    X = np.nan_to_num(X, nan=0.0, posinf=1e10, neginf=-1e10)
    X_scaled = scaler.transform(X)

    y_proba = model.predict_proba(X_scaled)[:, 1]
    y_pred = (y_proba >= threshold).astype(int)

    roc_auc = roc_auc_score(y, y_proba)
    pr_auc = average_precision_score(y, y_proba)
    precision = precision_score(y, y_pred, zero_division=0)
    recall = recall_score(y, y_pred, zero_division=0)
    f1 = f1_score(y, y_pred, zero_division=0)
    brier = brier_score_loss(y, y_proba)
    cm = confusion_matrix(y, y_pred)

    metrics = {
        "split": split_name,
        "roc_auc": float(roc_auc),
        "pr_auc": float(pr_auc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "brier_score": float(brier),
        "threshold": float(threshold),
        "confusion_matrix": cm.tolist(),
        "total_samples": int(len(y)),
        "positive_samples": int(y.sum()),
        "negative_samples": int(len(y) - y.sum()),
    }

    # Log results
    logger.info(f"\n{'='*60}")
    logger.info(f"  {split_name} EVALUATION (threshold={threshold:.2f})")
    logger.info(f"{'='*60}")
    logger.info(f"  ROC-AUC:   {roc_auc:.4f}")
    logger.info(f"  PR-AUC:    {pr_auc:.4f}")
    logger.info(f"  Precision: {precision:.4f}")
    logger.info(f"  Recall:    {recall:.4f}")
    logger.info(f"  F1:        {f1:.4f}")
    logger.info(f"  Brier:     {brier:.4f}")
    logger.info(f"  Confusion Matrix:")
    logger.info(f"    TN={cm[0][0]}  FP={cm[0][1]}")
    logger.info(f"    FN={cm[1][0]}  TP={cm[1][1]}")

    # LEAKAGE CHECK (Section 13.1)
    if roc_auc > 0.95:
        logger.warning(
            f"  ⚠ LEAKAGE ALERT: ROC-AUC={roc_auc:.4f} > 0.95 on {split_name}. "
            f"This is suspiciously high for a Logistic Regression baseline. "
            f"Investigate for leakage before proceeding."
        )

    return metrics


def save_baseline_artifacts(
    model: LogisticRegression,
    scaler: StandardScaler,
    metrics: dict,
    feature_columns: list[str],
    output_dir: Path | None = None,
) -> None:
    """Save baseline model, scaler, metrics, and feature list."""
    out = output_dir or MODEL_ARTIFACTS_DIR
    out.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, out / "baseline_lr_model.joblib")
    joblib.dump(scaler, out / "baseline_scaler.joblib")
    joblib.dump(feature_columns, out / "baseline_feature_columns.joblib")

    with open(out / "baseline_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info(f"  Baseline artifacts saved to {out}/")
