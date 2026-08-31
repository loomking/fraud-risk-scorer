"""Verify: genuine PASS/FLAG mix + threshold reclassification."""
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

# Score 8 diverse transactions
cases = [
    {"TransactionID": 3000001, "TransactionDT": 86400, "TransactionAmt": 150.0, "ProductCD": "W", "card1": 4000, "card4": "visa", "card6": "debit", "P_emaildomain": "gmail.com"},
    {"TransactionID": 3000002, "TransactionDT": 90000, "TransactionAmt": 25.50, "ProductCD": "W", "card1": 7919, "card4": "mastercard", "card6": "debit", "P_emaildomain": "yahoo.com"},
    {"TransactionID": 3000003, "TransactionDT": 172800, "TransactionAmt": 500.0, "ProductCD": "H", "card1": 3000, "card4": "discover", "card6": "credit", "P_emaildomain": "protonmail.com"},
    {"TransactionID": 3000004, "TransactionDT": 259200, "TransactionAmt": 12.99, "ProductCD": "C", "card1": 9500, "card4": "visa", "card6": "credit", "P_emaildomain": "outlook.com"},
    {"TransactionID": 3000005, "TransactionDT": 345600, "TransactionAmt": 75.00, "ProductCD": "W", "card1": 15885, "card4": "visa", "card6": "debit", "P_emaildomain": "gmail.com"},
    {"TransactionID": 3000006, "TransactionDT": 100000, "TransactionAmt": 300.0, "ProductCD": "H", "card1": 1111, "card4": "visa", "card6": "credit", "P_emaildomain": "hotmail.com"},
    {"TransactionID": 3000007, "TransactionDT": 200000, "TransactionAmt": 45.00, "ProductCD": "R", "card1": 2222, "card4": "mastercard", "card6": "debit", "P_emaildomain": "gmail.com"},
    {"TransactionID": 3000008, "TransactionDT": 300000, "TransactionAmt": 99.99, "ProductCD": "S", "card1": 3333, "card4": "american express", "card6": "credit", "P_emaildomain": "yahoo.com"},
]

print("=== SCORING 8 TRANSACTIONS (default threshold 0.050) ===")
results = []
for c in cases:
    r = client.post("/score", json=c)
    d = r.json()
    results.append(d)
    print(f"  TXN {d['transaction_id']}: risk={d['risk_probability']:.4f} -> {d['decision']}")

flags_default = sum(1 for d in results if d["decision"] == "FLAG")
passes_default = sum(1 for d in results if d["decision"] == "PASS")
print(f"\n  At threshold 0.050: {flags_default} FLAG, {passes_default} PASS")

# Now simulate threshold changes
print("\n=== RECLASSIFICATION AT DIFFERENT THRESHOLDS ===")
for threshold in [0.035, 0.050, 0.070, 0.100, 0.150]:
    flags = sum(1 for d in results if d["risk_probability"] >= threshold)
    passes = len(results) - flags
    names = []
    for d in results:
        dec = "FLAG" if d["risk_probability"] >= threshold else "PASS"
        names.append(f"{d['transaction_id']}={dec}")
    print(f"  t={threshold:.3f}: {flags} FLAG, {passes} PASS  [{', '.join(names)}]")
