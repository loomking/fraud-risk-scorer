import pandas as pd
from src.config import DATA_PROCESSED_DIR, MODEL_ARTIFACTS_DIR
import joblib
import numpy as np

print("Loading test features...")
test_feat = pd.read_parquet(DATA_PROCESSED_DIR / "test.parquet")
model = joblib.load(MODEL_ARTIFACTS_DIR / "calibrated_model.joblib")
cols = joblib.load(MODEL_ARTIFACTS_DIR / "xgboost_feature_columns.joblib")

# Get original data to show actual field values
test_raw = pd.read_csv("data/raw/train_transaction.csv")
test_raw = test_raw[test_raw["TransactionID"].isin(test_feat["TransactionID"])]

test_feat = test_feat[test_feat["isFraud"] == 0]
X = test_feat[cols].values
X = np.nan_to_num(X, nan=0.0, posinf=1e10, neginf=-1e10)

probs = model.predict_proba(X)[:, 1]
test_feat["risk_probability"] = probs

tns = test_feat[test_feat["risk_probability"] < 0.0038]

print(f"Total TNs below threshold: {len(tns)}")
if len(tns) == 0:
    print("GENUINELY NO REAL TEST-SET TRANSACTION SCORES BELOW THRESHOLD.")
else:
    tns = tns.drop(columns=["card4", "card6", "ProductCD"], errors="ignore")
    tns = tns.merge(test_raw[["TransactionID", "card4", "card6", "ProductCD"]], on="TransactionID", how="left")
    
    # Just grab the first 3
    sample = tns.head(3)
    for _, row in sample.iterrows():
        print("-" * 40)
        print(f"TransactionID: {row['TransactionID']}")
        print(f"TransactionAmt: {row['TransactionAmt']}")
        print(f"card1: {row['card1']}")
        print(f"card4: {row['card4']}")
        print(f"card6: {row['card6']}")
        print(f"ProductCD: {row['ProductCD']}")
        print(f"risk_probability: {row['risk_probability']:.6f}")
