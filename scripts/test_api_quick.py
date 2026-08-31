"""Quick API integration test script."""
import httpx
import json

API = 'http://localhost:8000'

# Test health
r = httpx.get(f'{API}/health')
print(f'Health: {r.json()}')

# Test scoring
score_req = {
    'TransactionID': 3663549,
    'TransactionDT': 86400,
    'TransactionAmt': 350.0,
    'ProductCD': 'W',
    'card1': 4000,
    'card4': 'visa',
    'card6': 'debit',
    'P_emaildomain': 'gmail.com',
}
r = httpx.post(f'{API}/score', json=score_req)
score_data = r.json()
print(f'Score: {json.dumps(score_data, indent=2)}')

# Test audit
r = httpx.get(f'{API}/audit/3663549')
audit_data = r.json()
event_count = len(audit_data["events"])
print(f'Audit events: {event_count}')

# Test report
r = httpx.get(f'{API}/report')
data = r.json()
print(f'Report: model={data["model_version"]}, threshold={data["threshold"]}, features={data["feature_count"]}')

print('\nAll API endpoints working!')
