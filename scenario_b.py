import os
import joblib
import pandas as pd
import numpy as np

from src.models.threshold import threshold_sweep, select_optimal_threshold, compute_cost_at_threshold

def main():
    print("Loading model...")
    model = joblib.load("models/calibrated_model.joblib")
    feature_columns = joblib.load("models/xgboost_feature_columns.joblib")

    print("Loading data splits...")
    val_feat = pd.read_parquet("data/processed/val.parquet")
    test_feat = pd.read_parquet("data/processed/test.parquet")

    X_val = val_feat[feature_columns].values
    X_val = np.nan_to_num(X_val, nan=0.0, posinf=1e10, neginf=-1e10)
    y_val = val_feat["isFraud"].values

    X_test = test_feat[feature_columns].values
    X_test = np.nan_to_num(X_test, nan=0.0, posinf=1e10, neginf=-1e10)
    y_test = test_feat["isFraud"].values

    print("Predicting probabilities...")
    y_proba_val = model.predict_proba(X_val)[:, 1]
    y_proba_test = model.predict_proba(X_test)[:, 1]

    # Scenario B: Median FN Cost = 6300
    print("\n--- Scenario B: Median FN Cost (INR 6300) ---")
    sweep = threshold_sweep(y_val, y_proba_val, fp_cost=50.0, fn_cost=6300.0)
    optimal = select_optimal_threshold(sweep)
    
    print(f"Optimal Threshold (Validation): {optimal['threshold']:.4f}")
    
    test_cost = compute_cost_at_threshold(y_test, y_proba_test, optimal["threshold"], fp_cost=50.0, fn_cost=6300.0)
    print(f"Test Fraud Capture: {test_cost['fraud_capture']:.4f} ({test_cost['tp']} / {int(y_test.sum())})")
    print(f"Test Review Rate: {test_cost['review_rate']:.4f} (({test_cost['tp']} + {test_cost['fp']}) / {len(y_test)})")
    
if __name__ == "__main__":
    main()
