"""
Probability calibration (Section 15).

Uses isotonic regression calibration on validation data.
Time-safe: calibration is fit on validation predictions, never test data.
"""

import logging
import json
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
from sklearn.isotonic import IsotonicRegression
from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss

from src.config import MODEL_ARTIFACTS_DIR, CALIBRATION_VERSION

logger = logging.getLogger(__name__)


class CalibratedModelWrapper:
    """
    Wraps a model with an isotonic regression calibrator.
    Sklearn 1.9 removed cv='prefit', so we do manual calibration.
    """

    def __init__(self, base_model, calibrator: IsotonicRegression):
        self.base_model = base_model
        self.calibrator = calibrator

    def predict_proba(self, X):
        """Return calibrated probabilities."""
        raw_proba = self.base_model.predict_proba(X)[:, 1]
        # Clip to calibrator's training range to avoid extrapolation
        cal_proba = self.calibrator.predict(raw_proba)
        cal_proba = np.clip(cal_proba, 0, 1)
        # Return 2-column format like sklearn
        return np.column_stack([1 - cal_proba, cal_proba])


def calibrate_model(
    model,
    val_df: pd.DataFrame,
    feature_columns: list[str],
    target_col: str = "isFraud",
    method: str = "isotonic",
) -> tuple:
    """
    Fit a calibration model on validation predictions.

    Does NOT refit the original model — wraps predictions only.
    Returns (calibrated_wrapper, calibration_report).
    """
    X_val = val_df[feature_columns].values
    y_val = val_df[target_col].values
    X_val = np.nan_to_num(X_val, nan=0.0, posinf=1e10, neginf=-1e10)

    # Get uncalibrated probabilities
    y_proba_uncal = model.predict_proba(X_val)[:, 1]
    brier_uncal = brier_score_loss(y_val, y_proba_uncal)

    # Fit isotonic regression: maps raw proba → calibrated proba
    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(y_proba_uncal, y_val)

    # Create wrapper
    calibrated = CalibratedModelWrapper(model, calibrator)

    # Get calibrated probabilities
    y_proba_cal = calibrated.predict_proba(X_val)[:, 1]
    brier_cal = brier_score_loss(y_val, y_proba_cal)

    # Calibration curve for reporting
    prob_true, prob_pred = calibration_curve(y_val, y_proba_cal, n_bins=10)

    report = {
        "calibration_version": CALIBRATION_VERSION,
        "method": method,
        "brier_score_uncalibrated": float(brier_uncal),
        "brier_score_calibrated": float(brier_cal),
        "brier_improvement": float(brier_uncal - brier_cal),
        "calibration_curve_true": prob_true.tolist(),
        "calibration_curve_pred": prob_pred.tolist(),
        "timestamp": datetime.utcnow().isoformat(),
    }

    logger.info(f"  Calibration ({method}):")
    logger.info(f"    Brier (uncalibrated): {brier_uncal:.4f}")
    logger.info(f"    Brier (calibrated):   {brier_cal:.4f}")
    logger.info(f"    Improvement:          {brier_uncal - brier_cal:.4f}")

    return calibrated, report


def save_calibration_artifacts(
    calibrated_model,
    report: dict,
    output_dir: Path | None = None,
) -> None:
    """Save calibrated model and calibration report."""
    out = output_dir or MODEL_ARTIFACTS_DIR
    out.mkdir(parents=True, exist_ok=True)

    joblib.dump(calibrated_model, out / "calibrated_model.joblib")

    with open(out / "calibration_report.json", "w") as f:
        json.dump(report, f, indent=2)

    logger.info(f"  Calibration artifacts saved to {out}/")
