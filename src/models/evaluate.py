"""
Evaluation report generation (Section 18).

Generates /reports/eval_report.md programmatically.
Every reported metric is computed from code — never manually typed.
"""

import json
import logging
from pathlib import Path
from datetime import datetime

import numpy as np

from src.config import MODEL_VERSION, CALIBRATION_VERSION, THRESHOLD_CONFIG_VERSION, FEATURE_PIPELINE_VERSION

logger = logging.getLogger(__name__)


def generate_eval_report(
    val_metrics: dict,
    test_metrics: dict,
    feature_importance: list[dict],
    threshold_config: dict,
    sensitivity: list[dict],
    calibration_report: dict,
    feature_count: int,
    split_report: dict,
    output_path: Path | None = None,
) -> str:
    """Generate the evaluation report markdown. All numbers from code."""
    output_path = output_path or Path("reports/eval_report.md")

    cm = test_metrics["confusion_matrix"]

    # Feature importance table
    fi_rows = "\n".join(
        f"| {f['rank']} | {f['feature']} | {f['importance']:.4f} |"
        for f in feature_importance
    )

    # Sensitivity table (these are from VALIDATION — clearly labeled in the report)
    sens_rows = "\n".join(
        f"| ₹{s['fp_cost_assumption']:.0f} | {s['optimal_threshold']:.4f} | "
        f"{s['review_rate']:.3f} | {s['fraud_capture']:.3f} | "
        f"₹{s['cost_per_1000_txns']:.0f} |"
        for s in sensitivity
    )

    # Compute business metrics from TEST confusion matrix (not from validation threshold_config)
    test_tp = cm[1][1]
    test_fn = cm[1][0]
    test_fp = cm[0][1]
    test_tn = cm[0][0]
    test_total = test_tp + test_fn + test_fp + test_tn
    test_fraud_capture = test_tp / (test_tp + test_fn) if (test_tp + test_fn) > 0 else 0
    test_review_rate = (test_tp + test_fp) / test_total if test_total > 0 else 0
    fp_cost = threshold_config['fp_cost_per_item']
    fn_cost = threshold_config['fn_cost_per_item']
    test_total_cost = test_fp * fp_cost + test_fn * fn_cost
    test_cost_per_1000 = test_total_cost / test_total * 1000 if test_total > 0 else 0

    report = f"""# Fraud Risk Scorer — Evaluation Report

> Generated programmatically at {datetime.utcnow().isoformat()}Z
> Every metric below is reproducible from repository code.

## Model Information

| Property | Value |
|---|---|
| Model | XGBoost |
| Model Version | {MODEL_VERSION} |
| Feature Pipeline Version | {FEATURE_PIPELINE_VERSION} |
| Calibration Version | {CALIBRATION_VERSION} |
| Threshold Config Version | {THRESHOLD_CONFIG_VERSION} |
| Feature Count | {feature_count} |
| Split | Temporal (70/15/15, chronological) |

## Headline Metrics (Test Set)

| Metric | Value |
|---|---|
| **PR-AUC** | **{test_metrics['pr_auc']:.4f}** |
| ROC-AUC | {test_metrics['roc_auc']:.4f} |
| Precision | {test_metrics['precision']:.4f} |
| Recall | {test_metrics['recall']:.4f} |
| F1 | {test_metrics['f1']:.4f} |
| Brier Score | {test_metrics['brier_score']:.4f} |

## Confusion Matrix (Test Set, threshold={test_metrics['threshold']:.4f})

|  | Predicted Legit | Predicted Fraud |
|---|---|---|
| **Actual Legit** | TN={cm[0][0]} | FP={cm[0][1]} |
| **Actual Fraud** | FN={cm[1][0]} | TP={cm[1][1]} |

## Business Metrics (Test Set)

| Metric | Value |
|---|---|
| Threshold | {threshold_config['threshold']:.4f} |
| Fraud Capture Rate | {test_fraud_capture:.4f} |
| Review Rate | {test_review_rate:.4f} |
| FP Cost Assumption (₹) | {fp_cost:.0f} |
| FN Cost Assumption (₹) | {fn_cost:.0f} |
| Expected Cost/1000 txns (₹) | {test_cost_per_1000:.0f} |

> **Note:** FP and FN costs are illustrative assumptions, NOT researched facts.

## Threshold Sensitivity Analysis (Validation Set, Section 17)

> Sensitivity analysis computed on validation set (threshold selection must not use test data).

| FP Cost (₹) | Optimal Threshold | Review Rate | Fraud Capture | Cost/1000 txns (₹) |
|---|---|---|---|---|
{sens_rows}

## Calibration (Section 15)

| Property | Value |
|---|---|
| Method | {calibration_report['method']} |
| Brier (uncalibrated) | {calibration_report['brier_score_uncalibrated']:.4f} |
| Brier (calibrated) | {calibration_report['brier_score_calibrated']:.4f} |
| Improvement | {calibration_report['brier_improvement']:.4f} |

## Top 20 Feature Importance

| Rank | Feature | Importance |
|---|---|---|
{fi_rows}

## Data Split

| Split | Rows | Fraud Count | Fraud % | DT Range |
|---|---|---|---|---|
| Train | {split_report['train_rows']} | {split_report['train_fraud_count']} | {split_report['train_fraud_pct']:.2f}% | {split_report['train_dt_min']}–{split_report['train_dt_max']} |
| Val | {split_report['val_rows']} | {split_report['val_fraud_count']} | {split_report['val_fraud_pct']:.2f}% | {split_report['val_dt_min']}–{split_report['val_dt_max']} |
| Test | {split_report['test_rows']} | {split_report['test_fraud_count']} | {split_report['test_fraud_pct']:.2f}% | {split_report['test_dt_min']}–{split_report['test_dt_max']} |

## Real vs Synthetic Components (Section 19)

| Component | Type |
|---|---|
| Transaction data | Real (IEEE-CIS) |
| Trained model | Real (XGBoost on IEEE-CIS) |
| Feature engineering | Real (computed from data) |
| Evaluation metrics | Real (computed on held-out test set) |
| Business cost assumptions | Illustrative (NOT researched facts) |
| Evidence narratives | AI-generated (LLM) |
| Audit trail | Real (database records) |

## Limitations (Section 45)

- Dataset is anonymized/masked (IEEE-CIS Fraud Detection)
- TransactionDT is a relative offset, not a real-world timestamp
- Synthetic UID constructed from card1+addr1+D1 (approximation)
- Business costs are estimated, not researched
- LLM evidence is AI-generated wording, not independently verified
- SQLite used for development (not production-grade)
- No authentication in hackathon MVP
"""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report, encoding="utf-8")
    logger.info(f"  Evaluation report saved to {output_path}")

    return report
