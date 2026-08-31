"""
Cost-based threshold selection (Sections 16, 17).

Never uses default 0.5 threshold. Threshold comes from explicit business cost function.
Sweep on VALIDATION data only — test data is never used for threshold selection.
"""

import logging
import json
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd

from src.config import (
    FP_COST_INR,
    FN_COST_INR,
    MODEL_ARTIFACTS_DIR,
    THRESHOLD_CONFIG_VERSION,
)

logger = logging.getLogger(__name__)


def compute_cost_at_threshold(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    threshold: float,
    fp_cost: float = FP_COST_INR,
    fn_cost: float = FN_COST_INR,
) -> dict:
    """
    Compute business cost metrics at a given threshold.

    Cost model:
      FP cost: manual review + customer friction (illustrative assumption, NOT researched)
      FN cost: expected fraud loss (illustrative assumption)
    """
    y_pred = (y_proba >= threshold).astype(int)

    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    tn = int(((y_pred == 0) & (y_true == 0)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())

    total = len(y_true)
    positives = int(y_true.sum())

    # Business metrics
    total_cost = fp * fp_cost + fn * fn_cost
    cost_per_1000 = total_cost / total * 1000 if total > 0 else 0
    review_rate = (tp + fp) / total if total > 0 else 0
    fraud_capture = tp / positives if positives > 0 else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = fraud_capture
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    return {
        "threshold": float(threshold),
        "tp": tp, "tn": tn, "fp": fp, "fn": fn,
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "review_rate": float(review_rate),
        "fraud_capture": float(fraud_capture),
        "fp_cost_per_item": float(fp_cost),
        "fn_cost_per_item": float(fn_cost),
        "total_fp_cost": float(fp * fp_cost),
        "total_fn_cost": float(fn * fn_cost),
        "total_cost": float(total_cost),
        "cost_per_1000_txns": float(cost_per_1000),
    }


def threshold_sweep(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    fp_cost: float = FP_COST_INR,
    fn_cost: float = FN_COST_INR,
    n_thresholds: int = 500,
) -> list[dict]:
    """
    Sweep thresholds from 0.0001 to 0.99 and compute cost at each.
    Returns list of cost metrics sorted by threshold.
    """
    # Use geomspace for finer granularity near the floor (0.0001 to 0.99)
    thresholds = np.geomspace(0.0001, 0.99, n_thresholds)
    results = []
    for t in thresholds:
        result = compute_cost_at_threshold(y_true, y_proba, t, fp_cost, fn_cost)
        results.append(result)
    return results


def select_optimal_threshold(
    sweep_results: list[dict],
) -> dict:
    """Select the threshold that minimizes total expected cost."""
    best = min(sweep_results, key=lambda x: x["total_cost"])
    return best


def threshold_sensitivity_analysis(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    fp_costs: list[float] = [25.0, 50.0, 100.0],
    fn_cost: float = FN_COST_INR,
) -> list[dict]:
    """
    Threshold sensitivity analysis (Section 17).

    Sweep FP cost across multiple values and report optimal threshold,
    review rate, fraud capture, expected cost for each.
    """
    results = []
    for fp_cost in fp_costs:
        sweep = threshold_sweep(y_true, y_proba, fp_cost=fp_cost, fn_cost=fn_cost)
        best = select_optimal_threshold(sweep)
        result = {
            "fp_cost_assumption": float(fp_cost),
            "fn_cost_assumption": float(fn_cost),
            "optimal_threshold": best["threshold"],
            "review_rate": best["review_rate"],
            "fraud_capture": best["fraud_capture"],
            "total_cost": best["total_cost"],
            "cost_per_1000_txns": best["cost_per_1000_txns"],
            "precision": best["precision"],
            "recall": best["recall"],
            "f1": best["f1"],
        }
        results.append(result)

        logger.info(
            f"  FP=₹{fp_cost:.0f}: threshold={best['threshold']:.4f}, "
            f"review={best['review_rate']:.3f}, capture={best['fraud_capture']:.3f}, "
            f"cost/1000=₹{best['cost_per_1000_txns']:.0f}"
        )

    return results


def save_threshold_artifacts(
    optimal: dict,
    sweep_results: list[dict],
    sensitivity: list[dict],
    output_dir: Path | None = None,
) -> None:
    """Save threshold selection artifacts."""
    out = output_dir or MODEL_ARTIFACTS_DIR
    out.mkdir(parents=True, exist_ok=True)

    artifacts = {
        "threshold_config_version": THRESHOLD_CONFIG_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "optimal_threshold": optimal,
        "sensitivity_analysis": sensitivity,
        "cost_assumptions": {
            "fp_cost_inr": optimal["fp_cost_per_item"],
            "fn_cost_inr": optimal["fn_cost_per_item"],
            "note": "These are illustrative assumptions, NOT researched facts.",
        },
    }

    with open(out / "threshold_config.json", "w") as f:
        json.dump(artifacts, f, indent=2)

    # Save full sweep for plotting
    with open(out / "threshold_sweep.json", "w") as f:
        json.dump(sweep_results, f, indent=2)

    logger.info(f"  Threshold artifacts saved to {out}/")
