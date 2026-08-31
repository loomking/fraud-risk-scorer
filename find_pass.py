"""Find a transaction that PASSes through the API code path by supplying ALL features."""
import json, numpy as np, pandas as pd, joblib
from src.config import MODEL_ARTIFACTS_DIR, DATA_PROCESSED_DIR

model = joblib.load(MODEL_ARTIFACTS_DIR / "calibrated_model.joblib")
cols = joblib.load(MODEL_ARTIFACTS_DIR / "xgboost_feature_columns.joblib")
cat_encoder = joblib.load(MODEL_ARTIFACTS_DIR / "categorical_encoder.joblib")
with open(MODEL_ARTIFACTS_DIR / "threshold_config.json") as f:
    threshold = json.load(f)["optimal_threshold"]["threshold"]

# Load raw data and engineered features
raw = pd.read_csv("data/raw/train_transaction.csv")
test_df = pd.read_parquet(DATA_PROCESSED_DIR / "test.parquet")

# Find transactions that PASS with full feature vector
legit = test_df[test_df["isFraud"] == 0]
X = legit[cols].values
X = np.nan_to_num(X, nan=0.0, posinf=1e10, neginf=-1e10)
probs = model.predict_proba(X)[:, 1]
legit = legit.copy()
legit["prob"] = probs
passes = legit[legit["prob"] < threshold].sort_values("prob")

print(f"Total PASS transactions in test set: {len(passes)}")
print(f"Threshold: {threshold:.6f}")
print()

# For the top PASS candidate, check what happens through the API path
# with ONLY the ScoreRequest-accepted fields
txn_id = passes.iloc[0]["TransactionID"]
raw_row = raw[raw["TransactionID"] == txn_id].iloc[0]

# The ScoreRequest schema accepts these fields:
api_fields = [
    "TransactionID", "TransactionDT", "TransactionAmt", "ProductCD",
    "card1", "card2", "card3", "card4", "card5", "card6",
    "addr1", "addr2", "dist1", "dist2",
    "P_emaildomain", "R_emaildomain",
    "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14",
    "D1", "DeviceType", "DeviceInfo"
]

payload = {}
for field in api_fields:
    if field in raw_row.index:
        val = raw_row[field]
        if pd.isna(val):
            continue
        if isinstance(val, (np.integer,)):
            val = int(val)
        elif isinstance(val, (np.floating,)):
            val = float(val)
        payload[field] = val

# Simulate exact API code path
vec = np.zeros(len(cols))
col_map = {c: i for i, c in enumerate(cols)}

for col_name, val in payload.items():
    if col_name in col_map:
        if col_name in cat_encoder.mappings:
            mapped = cat_encoder.mappings[col_name].get(str(val), -1)
            vec[col_map[col_name]] = float(mapped)
        else:
            vec[col_map[col_name]] = float(val)

if "amt_log" in col_map:
    vec[col_map["amt_log"]] = np.log1p(payload["TransactionAmt"])
if "amt_decimal" in col_map:
    vec[col_map["amt_decimal"]] = payload["TransactionAmt"] - int(payload["TransactionAmt"])
if "amt_is_round" in col_map:
    dec = payload["TransactionAmt"] - int(payload["TransactionAmt"])
    vec[col_map["amt_is_round"]] = 1.0 if dec < 0.01 else 0.0

vec = np.nan_to_num(vec, nan=0.0, posinf=1e10, neginf=-1e10)
prob_api = float(model.predict_proba(vec.reshape(1, -1))[0, 1])
decision_api = "FLAG" if prob_api >= threshold else "PASS"

print(f"TXN {txn_id} through API path (ScoreRequest fields only):")
print(f"  prob={prob_api:.6f} -> {decision_api}")
print(f"  (Full feature vector prob was {passes.iloc[0]['prob']:.6f})")
print()

# Count how many features in cols are directly in ScoreRequest
api_in_cols = sum(1 for c in cols if c in set(api_fields))
print(f"Features in model that ScoreRequest can supply: {api_in_cols} / {len(cols)}")
print(f"Missing features (set to zero): {len(cols) - api_in_cols}")

# Check which of the top-20 importance features are NOT in ScoreRequest
importance = model.calibrated_classifiers_[0].estimator.feature_importances_
top20_idx = np.argsort(importance)[::-1][:20]
print("\nTop-20 features and whether ScoreRequest can supply them:")
for rank, idx in enumerate(top20_idx, 1):
    feat = cols[idx]
    in_api = feat in set(api_fields)
    print(f"  {rank}. {feat} (importance={importance[idx]:.4f}) {'AVAILABLE' if in_api else 'MISSING from API'}")
