import urllib.request
import json

BASE_URL = "https://fraud-risk-scorer.onrender.com"
TXN_ID = 2987000

payload = {
    "TransactionID": 1000001,
    "TransactionDT": 86400,
    "TransactionAmt": 150.0,
    "ProductCD": "W",
    "card1": 4000,
    "card4": "visa",
    "card6": "debit",
    "P_emaildomain": "gmail.com"
}

print(f"Scoring transaction {TXN_ID} on LIVE...")
req = urllib.request.Request(f"{BASE_URL}/score", data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
res = urllib.request.urlopen(req)
score_data = json.loads(res.read())
print(json.dumps(score_data, indent=2))

if score_data.get("decision") == "FLAG":
    print(f"\nGenerating evidence for flagged transaction {TXN_ID} on LIVE...")
    req_ev = urllib.request.Request(f"{BASE_URL}/evidence/{TXN_ID}", data=b"", headers={"Content-Type": "application/json"})
    res_ev = urllib.request.urlopen(req_ev)
    ev_data = json.loads(res_ev.read())
    print(json.dumps(ev_data, indent=2))
else:
    print("\nTransaction was not flagged.")
