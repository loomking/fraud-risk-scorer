import json
import logging
import pandas as pd
from fastapi.testclient import TestClient
from api.main import app
from src.db.session import SessionLocal
from src.db.models import EvidencePacket
import api.routes.score

logging.basicConfig(level=logging.INFO)
client = TestClient(app)

def run():
    print("1. Finding a REAL transaction from the raw data that naturally flags...")
    
    # Load raw data (tail end, which falls in the test split)
    # Using python engine or just skip rows to get the end to save memory
    test_df = pd.read_csv("data/raw/train_transaction.csv", skiprows=lambda x: x > 0 and x < 400000)
    
    # Load model and artifacts
    model, feature_columns, freq_maps = api.routes.score._load_artifacts()
    threshold = api.routes.score.DEFAULT_THRESHOLD
    print(f"   Production Threshold is: {threshold}")
    
    # Find a transaction that actually scores above threshold
    flagged_txn = None
    real_prob = 0.0
    
    for _, row in test_df[test_df["isFraud"] == 1].iterrows():
        txn_data = row.to_dict()
        vec, _ = api.routes.score._build_v2_feature_vector(txn_data, feature_columns, freq_maps)
        prob = model.predict_proba(vec.reshape(1, -1))[0, 1]
        
        if prob >= threshold:
            flagged_txn = txn_data
            real_prob = prob
            break
            
    if not flagged_txn:
        print("Could not find a true positive transaction that flags!")
        return
        
    print(f"   Found TransactionID {flagged_txn['TransactionID']} with risk_probability {real_prob:.4f}")
    
    print("\n2. Scoring via API...")
    # Clean up NaN values for JSON
    clean_txn = {k: (v if pd.notna(v) else None) for k, v in flagged_txn.items()}
    clean_txn["TransactionID"] = int(clean_txn["TransactionID"])
    clean_txn["TransactionDT"] = int(clean_txn["TransactionDT"])
    
    score_res = client.post("/score", json=clean_txn)
    score_data = score_res.json()
    print(json.dumps(score_data, indent=2))
    
    txn_id = score_data["transaction_id"]
    
    print("\n3. Generating Evidence...")
    ev_res = client.post(f"/evidence/{txn_id}")
    if ev_res.status_code != 200:
        print(f"Error: {ev_res.text}")
        return
        
    ev_data = ev_res.json()
    
    print("\n================ EXACT LLM CONTEXT & OUTPUT ================")
    db = SessionLocal()
    packet = db.query(EvidencePacket).filter_by(transaction_id=txn_id).first()
    
    print("\n--- SOURCE FIELDS SENT TO LLM ---")
    print(json.dumps(packet.source_fields, indent=2))
    
    print("\n--- EVIDENCE RESPONSE ---")
    print(json.dumps(ev_data, indent=2))
    
    print("\n--- GROUNDING VALID ---")
    print(ev_data["grounding_valid"])

if __name__ == "__main__":
    run()
