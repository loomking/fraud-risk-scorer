import os
import json
import joblib
import pandas as pd
import numpy as np
from src.agent.evidence_agent import build_evidence_context, generate_evidence
from dotenv import load_dotenv

load_dotenv()

def main():
    print("Loading model...")
    model = joblib.load("models/calibrated_model.joblib")
    feature_columns = joblib.load("models/xgboost_feature_columns.joblib")

    print("Loading test data...")
    test_feat = pd.read_parquet("data/processed/test.parquet")
    
    # Find a highly suspicious transaction
    y_test = test_feat["isFraud"].values
    
    # Grab the first actual fraud case
    fraud_indices = np.where(y_test == 1)[0]
    idx = fraud_indices[0]
    
    txn_feat = test_feat.iloc[idx:idx+1]
    txn_id = txn_feat["TransactionID"].values[0]
    
    # Get raw data directly from the processed features (it has most of these before scaling if we use original, 
    # but some are scaled. We can just pass the processed values for this demo, or mock them based on what's available).
    raw_dict = {
        "TransactionAmt": float(txn_feat["TransactionAmt"].values[0]),
        "ProductCD": str(txn_feat["ProductCD"].values[0]) if "ProductCD" in txn_feat else "W",
        "card1": float(txn_feat["card1"].values[0]),
        "card4": str(txn_feat["card4"].values[0]) if "card4" in txn_feat else "visa",
        "card6": str(txn_feat["card6"].values[0]) if "card6" in txn_feat else "credit",
        "P_emaildomain": str(txn_feat["P_emaildomain"].values[0]) if "P_emaildomain" in txn_feat else "gmail.com",
    }
    
    X_test = txn_feat[feature_columns].values
    X_test = np.nan_to_num(X_test, nan=0.0, posinf=1e10, neginf=-1e10)
    
    proba = float(model.predict_proba(X_test)[0, 1])
    
    # Calculate causal features manually or extract from txn_feat
    causal = {
        "uid_txn_count_hist": float(txn_feat["uid_txn_count_hist"].values[0]),
        "uid_avg_amt_hist": float(txn_feat["uid_avg_amt_hist"].values[0]),
        "uid_prior_fraud_rate": float(txn_feat["uid_prior_fraud_rate"].values[0]),
    }
    
    context = build_evidence_context(
        transaction_data=raw_dict,
        risk_probability=proba,
        threshold=0.0033,
        decision="FLAG",
        causal_features=causal
    )
    
    print("\n" + "="*50)
    print("CONTEXT SENT TO LLM:")
    print(json.dumps(context, indent=2, default=str))
    print("="*50 + "\n")
    
    print("Calling Groq LLM...")
    response = generate_evidence(txn_id, context)
    
    print("\n" + "="*50)
    print("EVIDENCE AGENT RESPONSE:")
    print(f"Status: {response.status}")
    print(f"Grounding Valid: {response.grounding_valid}")
    print(f"Summary: {response.summary}")
    print("Risk Factors:")
    for rf in response.evidence:
        print(f"- {rf.claim}")
        print(f"  Sources: {rf.sources}")
    print("="*50 + "\n")

if __name__ == "__main__":
    main()
