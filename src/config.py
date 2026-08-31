"""
Project-wide configuration and settings.

All versioned parameters, paths, and business assumptions are centralized here.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_RAW_DIR = PROJECT_ROOT / os.getenv("DATA_RAW_DIR", "data/raw")
DATA_PROCESSED_DIR = PROJECT_ROOT / os.getenv("DATA_PROCESSED_DIR", "data/processed")
MODEL_ARTIFACTS_DIR = PROJECT_ROOT / os.getenv("MODEL_ARTIFACTS_DIR", "models")

# ── Dataset files ─────────────────────────────────────────────────────────────
TRAIN_TRANSACTION_FILE = DATA_RAW_DIR / "train_transaction.csv"
TRAIN_IDENTITY_FILE = DATA_RAW_DIR / "train_identity.csv"

# ── Versioning ────────────────────────────────────────────────────────────────
FEATURE_PIPELINE_VERSION = os.getenv("FEATURE_PIPELINE_VERSION", "v1.0.0")
MODEL_VERSION = os.getenv("MODEL_VERSION", "v1.0.0")
CALIBRATION_VERSION = os.getenv("CALIBRATION_VERSION", "v1.0.0")
THRESHOLD_CONFIG_VERSION = os.getenv("THRESHOLD_CONFIG_VERSION", "v1.0.0")

# ── Business cost assumptions (INR) ──────────────────────────────────────────
# FP_COST: manual review cost + customer friction per false positive (illustrative assumption, NOT researched)
# FN_COST: expected fraud loss per false negative. Derived from training data mean fraud amount ($149.24).
# NOTE: The dataset currency is not officially confirmed as USD by Kaggle/Vesta (this is an assumption).
# Conversion rate used: 1 USD = 84.00 INR (Assumed rate for August 2026). $149.24 * 84.00 = ~₹12536.
FP_COST_INR = float(os.getenv("FP_COST_INR", "50.0"))
FN_COST_INR = float(os.getenv("FN_COST_INR", "12536.0"))

# ── Temporal split ratios ─────────────────────────────────────────────────────
# Earliest ~70% train, next ~15% validation, final ~15% test
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

# ── Dev subset ────────────────────────────────────────────────────────────────
# For fast iteration; sort by TransactionDT then head(N).
# See Section 4.3: increase if <50-100 positive cases in subset.
DEV_SUBSET_SIZE = 30_000

# ── LLM / Evidence Agent ─────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
LLM_TEMPERATURE = 0  # Required for reproducibility (Section 23)

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{PROJECT_ROOT / 'fraud_risk.db'}")

# ── API ───────────────────────────────────────────────────────────────────────
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# ── Expected dataset properties ──────────────────────────────────────────────
EXPECTED_TRANSACTION_ROWS = 590_540  # IEEE-CIS train_transaction.csv
EXPECTED_IDENTITY_ROWS = 144_233    # IEEE-CIS train_identity.csv
REQUIRED_TRANSACTION_COLUMNS = [
    "TransactionID", "isFraud", "TransactionDT", "TransactionAmt",
    "ProductCD", "card1", "card2", "card3", "card4", "card5", "card6",
    "addr1", "addr2", "P_emaildomain", "R_emaildomain",
]
REQUIRED_IDENTITY_COLUMNS = [
    "TransactionID", "DeviceType", "DeviceInfo",
]
