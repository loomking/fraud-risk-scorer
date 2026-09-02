import numpy as np
import joblib
from pathlib import Path
from sklearn.metrics import average_precision_score, roc_auc_score
from src.data import load_raw_data, join_transaction_identity, temporal_split
from src.features.build_features_v2 import build_features_v2
import logging

logging.basicConfig(level=logging.INFO)

# 1. Load data
df1, df2 = load_raw_data()
df = join_transaction_identity(df1, df2)
train_df, val_df, test_df = temporal_split(df)
print("Test DF rows:", len(test_df))

# 2. Build features
out = build_features_v2(train_df, val_df, test_df)
test_feat = out[2]

# 3. Load model & feature columns
model_dir = Path("models/v2/v2.0.1")
model = joblib.load(model_dir / "xgboost_model.joblib")
feature_cols = joblib.load(model_dir / "feature_columns.joblib")

# 4. Prepare X and y
X_test = test_feat[feature_cols].values
X_test = np.nan_to_num(X_test, nan=0.0, posinf=1e10, neginf=-1e10)
y_test = test_feat["isFraud"].values

# 5. Predict
y_prob = model.predict_proba(X_test)[:, 1]

# 6. Evaluate
pr_auc = average_precision_score(y_test, y_prob)
roc_auc = roc_auc_score(y_test, y_prob)

print("\n--- BATCH EVALUATION ON FROZEN v2.0.1 ---")
print(f"ROC-AUC: {roc_auc:.4f}")
print(f"PR-AUC:  {pr_auc:.4f}")
