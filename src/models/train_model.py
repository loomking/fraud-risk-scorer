"""
Main XGBoost fraud model (Section 13.2).

Uses temporal validation (expanding window), class imbalance handling via
scale_pos_weight, and honest evaluation on held-out validation data.
"""

import logging
import json
import hashlib
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
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

from src.config import MODEL_ARTIFACTS_DIR, MODEL_VERSION

logger = logging.getLogger(__name__)


def train_xgboost(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    feature_columns: list[str],
    target_col: str = "isFraud",
) -> xgb.XGBClassifier:
    """
    Train XGBoost with scale_pos_weight for class imbalance (Section 12).

    Uses validation set for early stopping to prevent overfitting.
    No random K-fold — single temporal train/val split per spec.
    """
    X_train = train_df[feature_columns].values
    y_train = train_df[target_col].values
    X_val = val_df[feature_columns].values
    y_val = val_df[target_col].values

    # Handle NaN/inf
    X_train = np.nan_to_num(X_train, nan=0.0, posinf=1e10, neginf=-1e10)
    X_val = np.nan_to_num(X_val, nan=0.0, posinf=1e10, neginf=-1e10)

    # Scale pos weight: ratio of negatives to positives (Section 12)
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
        eval_metric="aucpr",  # PR-AUC for imbalanced data
        early_stopping_rounds=50,
        n_jobs=-1,
        tree_method="hist",
    )

    logger.info(f"Training XGBoost on {X_train.shape[0]} samples, "
                f"{X_train.shape[1]} features...")

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=50,
    )

    # Log best iteration
    logger.info(f"  Best iteration: {model.best_iteration}")
    logger.info(f"  Best validation score: {model.best_score:.4f}")

    return model


def evaluate_xgboost(
    model: xgb.XGBClassifier,
    eval_df: pd.DataFrame,
    feature_columns: list[str],
    target_col: str = "isFraud",
    split_name: str = "VAL",
    threshold: float = 0.5,
) -> dict:
    """Evaluate XGBoost model. Returns metrics dict."""
    X = eval_df[feature_columns].values
    y = eval_df[target_col].values
    X = np.nan_to_num(X, nan=0.0, posinf=1e10, neginf=-1e10)

    y_proba = model.predict_proba(X)[:, 1]
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
        "model": "XGBoost",
        "model_version": MODEL_VERSION,
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
        "best_iteration": int(model.best_iteration) if hasattr(model, 'best_iteration') else None,
    }

    logger.info(f"\n{'='*60}")
    logger.info(f"  {split_name} EVALUATION — XGBoost (threshold={threshold:.4f})")
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

    return metrics


def get_feature_importance(
    model: xgb.XGBClassifier,
    feature_columns: list[str],
    top_n: int = 20,
) -> list[dict]:
    """Get top N features by importance (gain)."""
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1][:top_n]

    result = []
    for rank, idx in enumerate(indices, 1):
        result.append({
            "rank": rank,
            "feature": feature_columns[idx],
            "importance": float(importances[idx]),
        })
        logger.info(f"  #{rank:2d}: {feature_columns[idx]:40s} {importances[idx]:.4f}")

    return result


def save_xgboost_artifacts(
    model: xgb.XGBClassifier,
    metrics: dict,
    feature_columns: list[str],
    feature_importance: list[dict],
    output_dir: Path | None = None,
) -> str:
    """Save XGBoost model and metadata. Returns model version hash."""
    out = output_dir or MODEL_ARTIFACTS_DIR
    out.mkdir(parents=True, exist_ok=True)

    model_path = out / "xgboost_model.joblib"
    joblib.dump(model, model_path)
    joblib.dump(feature_columns, out / "xgboost_feature_columns.joblib")

    # Generate model hash for versioning
    model_bytes = model_path.read_bytes()
    model_hash = hashlib.sha256(model_bytes).hexdigest()[:12]

    metadata = {
        "model_version": MODEL_VERSION,
        "model_hash": model_hash,
        "timestamp": datetime.utcnow().isoformat(),
        "n_features": len(feature_columns),
        "best_iteration": int(model.best_iteration) if hasattr(model, 'best_iteration') else None,
        "metrics": metrics,
        "feature_importance_top20": feature_importance,
    }

    with open(out / "xgboost_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"  XGBoost artifacts saved to {out}/ (hash: {model_hash})")
    return model_hash
