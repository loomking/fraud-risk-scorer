# Fraud Risk Scorer — Razorpay AI Buildathon Track 2

> **AI Risk Manager**: A fraud decision system whose predictions are temporally valid, whose threshold reflects an explicit business cost, whose evidence is mechanically grounded to supplied transaction data, and whose decisions are reconstructable after the fact.

## Decision Chain

```
Raw Transaction → Feature Pipeline → Risk Probability → Business Threshold → PASS/FLAG → Grounded Evidence → Source Fields → Audit Trail
```

A judge can take any transaction and follow this chain end-to-end.

## Architecture

```mermaid
graph LR
    A[Transaction Input] --> B[Input Validation]
    B --> C[Feature Pipeline v1.0.0]
    C --> D[XGBoost Model]
    D --> E[Isotonic Calibration]
    E --> F[Risk Probability]
    F --> G{Cost-Based Threshold}
    G -->|≥ 0.0149| H[FLAG]
    G -->|< 0.0149| I[PASS]
    H --> J[Evidence Agent]
    J --> K[Grounding Validator]
    K -->|Valid| L[Evidence Packet]
    K -->|Invalid| M[Rejection + Audit]
    L --> N[Audit Trail]
    I --> N
    H --> N
    N --> O[SQLite Database]
```

**Architectural invariant (Section 2.7):** The LLM cannot make the fraud decision. The ML system decides. The LLM only produces evidence for already-flagged transactions.

## Problem Statement

Fraud and chargeback risk scoring for payment transactions using the IEEE-CIS Fraud Detection dataset. The system produces:

1. **Risk Classifier** — XGBoost model scoring transactions for fraud probability using held-out, time-based evaluation
2. **Evidence Agent** — For flagged transactions, an LLM agent drafts structured evidence using only information explicitly supplied in the transaction's scoring context

## Dataset

**IEEE-CIS Fraud Detection** (Kaggle) — 590,540 transactions with 394 features.

- **Why this dataset:** Large-scale, realistic fraud detection with rich categorical features, time ordering, and ~3.5% positive rate
- **TransactionDT:** Relative time offset in seconds, NOT a real datetime. Used strictly for ordering and splitting — no calendar features derived (Section 5.1)
- **V1-V339:** Block-aligned missingness handled with sentinel values (-999), not mean imputation (Section 5.2)
- **Identity join:** Only ~24% of transactions have identity records. `has_identity` boolean feature created explicitly (Section 5.3)

## Feature Engineering

### Temporal Split (Section 9)
- **Train:** earliest ~70% (413,378 rows, 14,538 fraud at 3.52%)
- **Validation:** next ~15% (88,581 rows, 3,042 fraud at 3.43%)
- **Test:** final ~15% (88,581 rows, 3,083 fraud at 3.48%)
- No random splitting anywhere. Verified with automated tests.

### Leakage Prevention (Section 10)
- **Prediction-time check:** Every feature verified as available at transaction submission time
- **Causal historical aggregates:** Uses expanding window + shift(1) — only strictly earlier transactions per UID
- **Frequency encoding:** Fit on training data only, never the full dataset
- **Feature audit table:** Documented inline in `src/features/build_features.py`

### Imbalance Handling (Section 12)
- ~3.5% positive (fraud) rate
- XGBoost: `scale_pos_weight = neg_count / pos_count ≈ 27.4`
- Baseline LR: `class_weight='balanced'`

## Model Approach

### Baseline (Section 13.1)
- Logistic Regression with balanced class weights
- ROC-AUC: 0.8070 — below 0.95, confirming no leakage

### Main Model (Section 13.2)
- **XGBoost** with early stopping on temporal validation
- `n_estimators=500, max_depth=6, learning_rate=0.05`
- Best iteration: 497 (PR-AUC metric)

### Test Set Performance (88,581 untouched rows)

> **Scenario A (Headline):** FN Cost derived from MEAN fraud amount (₹12,536).
> **Scenario B:** FN Cost derived from MEDIAN fraud amount (₹6,300).
>
> **CRITICAL DEPLOYMENT NOTE:** Scenario A (mean-based, threshold 0.0039) is the frozen threshold actually deployed in the live system. Scenario B (median-based) is presented as a comparative analysis, not currently active.
>
> *Note on Review Rate:* The 52.53% review rate in Scenario A reflects the outsized influence of the mean fraud amount, which is highly sensitive to a small number of catastrophic fraud transactions; the median-based Scenario B produces a materially lower, more operationally realistic review rate (47.12%).

| Metric | Scenario A (Mean, ₹12,536 FN) | Scenario B (Median, ₹6,300 FN) |
|---|---|---|
| Threshold | **0.0039** (Frozen) | 0.0079 |
| Recall (fraud capture, Test) | **94.71%** (2,920 / 3,083) | 93.55% (2,884 / 3,083) |
| Review rate (Test) | 52.53% | 47.12% |
| Precision (Test) | 6.28% | 6.91% |
| ROC-AUC (Test) | 0.8926 | 0.8926 |
| PR-AUC (Test) | 0.4968 | 0.4968 |

Confusion matrix at threshold 0.0039 (Scenario A, Test Set): TN=41,892 | FP=43,606 | FN=163 | TP=2,920

### Probability Calibration (Section 15)
- Isotonic regression calibration on validation predictions
- Brier score improvement: 0.0688 → 0.0220

### Threshold Selection (Section 16)
- **Never 0.5.** Cost-based selection on validation data.
- FP cost: ₹50 (manual review + friction) — **illustrative assumption, NOT researched**
- FN cost derivation methodology:
  - **Currency Assumption**: Assumes dataset is in USD (not officially confirmed by Kaggle). Uses 1 USD = 84.00 INR (August 2026).
  - **Scenario A (Mean)**: Expected loss = $149.24 → ₹12,536. Chosen because fraud losses are heavily right-skewed by rare, massive transactions, and a cost model must weight against catastrophic impact. Drives optimal threshold down to **0.0039**.
  - **Scenario B (Median)**: Expected loss = $75.00 → ₹6,300. Evaluated because the mean is heavily skewed by outliers, and the median provides a more operationally realistic review rate. Drives optimal threshold to **0.0079**.

### Threshold Sensitivity (Validation Set, Section 17)

> Computed on validation set (88,581 rows) using Scenario A (Mean FN Cost). Threshold selection must not use test data.

| FP Cost (₹) | Threshold | Review Rate (Val) | Fraud Capture (Val) | Cost/1000 (₹) |
|---|---|---|---|---|
| 25 | 0.0019 | 68.1% | 98.8% | 21,275 |
| 50 | 0.0039 | 56.2% | 97.5% | 37,032 |
| 100 | 0.0079 | 50.5% | 96.3% | 63,286 |

## Evidence Agent Architecture (Section 22-26)

1. **Context builder:** Selects explicit fields from the scored transaction — no hidden DB access
2. **LLM call:** Groq API (Model: `openai/gpt-oss-120b`), temperature=0, structured JSON output
3. **Grounding validator:** Deterministic code that verifies every cited field exists in the supplied context and values match. This is the safety mechanism — not the prompt.
4. **Deliberate hallucination test:** `tests/test_agent_grounding.py` injects fabricated fields (e.g., "IP_Address_Score") and asserts the validator catches them.

## Audit Trail (Section 20)

- SQLite + SQLAlchemy with **append-only audit log** (event listeners prevent updates/deletes)
- Events: `score_computed`, `decision_made`, `evidence_generated`, `grounding_failure`
- Every score stores: model version, feature pipeline version, calibration version, threshold config version, cost assumptions, feature hash

## Reproducibility

```bash
# 1. Clone and install
git clone <repo>
cd Razorpay
uv sync --all-extras

# 2. Download dataset
kaggle competitions download -c ieee-fraud-detection -p data/raw/
cd data/raw && unzip ieee-fraud-detection.zip && cd ../..

# 3. Run full pipeline (trains model, calibrates, evaluates on all 590k rows)
uv run python -m src.pipeline_phase2 --full

# 4. Run tests (48 tests)
uv run pytest tests/ -v

# 5. Start API server (serves frontend + API)
uv run uvicorn api.main:app --reload --port 8000

# 6. Open dashboard at http://localhost:8000
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/score` | Score a transaction (Section 28.1) |
| POST | `/evidence/{id}` | Generate evidence for flagged transaction (Section 28.2) |
| GET | `/audit/{id}` | Get audit trail (Section 28.3) |
| GET | `/report` | Get dashboard data (Section 28.4) |
| GET | `/health` | Health check |

## Known Limitations (Section 45)

- Dataset is anonymized/masked (IEEE-CIS)
- TransactionDT has no real-world timestamp interpretation
- Synthetic UID constructed from card1+addr1+D1 (approximation)
- Business costs are estimated, not researched
- **Target Leakage / Temporal Assumption:** The `uid_prior_fraud_rate` feature assumes immediate label availability (it uses the `isFraud` label from a user's previous transaction immediately at the time of their next transaction). In reality, fraud reporting (chargebacks) typically lags by weeks or months, meaning this feature would not be fully available at prediction time in production (Section 10.1).
- LLM evidence is AI-generated wording, not independently verified
- SQLite for development (not production-grade)
- No authentication in hackathon MVP

## Real vs Synthetic Components (Section 19)

| Component | Type |
|---|---|
| Transaction data | Real (IEEE-CIS) |
| Model & evaluation | Real (XGBoost on IEEE-CIS) |
| Features | Real (computed from data) |
| Business costs | Illustrative assumptions |
| Evidence narratives | AI-generated (LLM) |
| Audit trail | Real (database records) |

## Tech Stack

Python 3.11 | pandas | scikit-learn | XGBoost | FastAPI | SQLAlchemy | SQLite | Groq (LLM) | uv (dependency management)
