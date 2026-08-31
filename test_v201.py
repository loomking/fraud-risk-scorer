"""Test v2.0.1 scoring endpoint locally."""
from fastapi.testclient import TestClient
from api.main import app
import json

client = TestClient(app)

cases = [
    {"TransactionID": 2000001, "TransactionDT": 86400, "TransactionAmt": 150.0, "ProductCD": "W", "card1": 4000, "card4": "visa", "card6": "debit", "P_emaildomain": "gmail.com"},
    {"TransactionID": 2000002, "TransactionDT": 90000, "TransactionAmt": 25.50, "ProductCD": "W", "card1": 7919, "card4": "mastercard", "card6": "debit", "P_emaildomain": "yahoo.com"},
    {"TransactionID": 2000003, "TransactionDT": 172800, "TransactionAmt": 500.0, "ProductCD": "H", "card1": 3000, "card4": "discover", "card6": "credit", "P_emaildomain": "protonmail.com"},
    {"TransactionID": 2000004, "TransactionDT": 259200, "TransactionAmt": 12.99, "ProductCD": "C", "card1": 9500, "card4": "visa", "card6": "credit", "P_emaildomain": "outlook.com"},
    {"TransactionID": 2000005, "TransactionDT": 345600, "TransactionAmt": 75.00, "ProductCD": "W", "card1": 15885, "card4": "visa", "card6": "debit", "P_emaildomain": "gmail.com"},
    {"TransactionID": 2000006, "TransactionDT": 432000, "TransactionAmt": 200.0, "ProductCD": "S", "card1": 1234, "card4": "american express", "card6": "credit", "P_emaildomain": "aol.com"},
    {"TransactionID": 2000007, "TransactionDT": 518400, "TransactionAmt": 9.99, "ProductCD": "W", "card1": 9500, "card4": "visa", "card6": "debit", "P_emaildomain": "gmail.com"},
    {"TransactionID": 2000008, "TransactionDT": 604800, "TransactionAmt": 1200.0, "ProductCD": "W", "card1": 5555, "card4": "mastercard", "card6": "debit", "P_emaildomain": "hotmail.com"},
]

print(f"Testing {len(cases)} transactions at threshold 0.050...")
flags = 0
passes = 0
for c in cases:
    r = client.post("/score", json=c)
    d = r.json()
    txn_id = d["transaction_id"]
    risk = d["risk_probability"]
    dec = d["decision"]
    if dec == "FLAG":
        flags += 1
    else:
        passes += 1
    print(f"  TXN {txn_id}: risk={risk:.4f} -> {dec}  (amt={c['TransactionAmt']}, card4={c['card4']}, pcd={c['ProductCD']})")

print(f"\nSummary: {flags} FLAG, {passes} PASS out of {len(cases)} transactions")

# Test /report
r = client.get("/report")
report = r.json()
print(f"\nReport endpoint:")
print(f"  model_version: {report['model_version']}")
print(f"  threshold: {report['threshold']}")
print(f"  feature_count: {report['feature_count']}")
print(f"  pr_curve points: {len(report.get('pr_curve', []))}")
print(f"  total_scored: {report['total_scored']}")
