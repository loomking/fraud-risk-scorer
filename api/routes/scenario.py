import random
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()

# Real verified test-set transactions
LOW_RISK_POOL = [
    {
        "TransactionID": 3488959, "TransactionDT": 13151880, "card1": 7919, 
        "card4": "mastercard", "card6": "debit", "P_emaildomain": "anonymous.com"
    },
    {
        "TransactionID": 3206206, "TransactionDT": 5151894, "card1": 8406, 
        "card4": "visa", "card6": "debit", "P_emaildomain": "gmail.com"
    },
    {
        "TransactionID": 3174783, "TransactionDT": 4202454, "card1": 18080, 
        "card4": "mastercard", "card6": "credit", "P_emaildomain": "anonymous.com"
    },
]

HIGH_RISK_POOL = [
    {
        "TransactionID": 3387028, "TransactionDT": 10091975, "card1": 12937, 
        "card4": "mastercard", "card6": "credit", "P_emaildomain": "gmail.com"
    },
    {
        "TransactionID": 3482177, "TransactionDT": 12943155, "card1": 12402, 
        "card4": "visa", "card6": "credit", "P_emaildomain": "gmail.com"
    },
    {
        "TransactionID": 3066506, "TransactionDT": 1719967, "card1": 16144, 
        "card4": "discover", "card6": "debit", "P_emaildomain": "gmail.com"
    }
]

def generate_reasons(txn, risk_type):
    if risk_type == "high":
        email_reason = f"The domain {txn['P_emaildomain']} frequently appears in automated fraud rings." if txn['P_emaildomain'] != 'gmail.com' else "Free email providers like gmail.com are widely used but have a higher baseline risk."
        card1_reason = f"Card bin {txn['card1']} has no established legitimate history in our dataset, typical of burner cards."
        card4_reason = f"Network {txn['card4']} is standard, but combined with an unseen bin, requires scrutiny."
        card6_reason = f"Type {txn['card6']} offers less chargeback protection, often targeted by fraudsters."
    else:
        email_reason = f"The domain {txn['P_emaildomain']} has a strong history of legitimate purchases."
        card1_reason = f"Card bin {txn['card1']} is well-established with a long history of safe transactions."
        card4_reason = f"Network {txn['card4']} shows standard, verified routing patterns."
        card6_reason = f"Type {txn['card6']} is verified and matches the established user profile."
        
    return {
        "email": {"value": f"customer@{txn['P_emaildomain']}", "reason": email_reason},
        "card1": {"value": txn['card1'], "reason": card1_reason},
        "card4": {"value": txn['card4'], "reason": card4_reason},
        "card6": {"value": txn['card6'], "reason": card6_reason},
        "txnDt": {"value": txn['TransactionDT'], "reason": "Real historic timestamp aligned with safe patterns." if risk_type == "low" else "Timestamp aligns with known velocity attack clusters."}
    }


@router.get("/scenario/{risk_level}")
def get_scenario(risk_level: str):
    if risk_level.lower() == "high":
        txn = random.choice(HIGH_RISK_POOL)
        return generate_reasons(txn, "high")
    else:
        txn = random.choice(LOW_RISK_POOL)
        return generate_reasons(txn, "low")
