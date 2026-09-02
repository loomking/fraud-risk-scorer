# What Broke — Failure Log

> Every system has bugs. The measure of engineering rigor is whether you find them before a user does, document them honestly, and prove the fix worked. This document records every major failure we discovered, the root cause, and how we resolved it.

---

## 1. Target Leakage in `uid_prior_fraud_rate`

**Discovered during:** Manual feature audit, before final evaluation.  
**Severity:** Critical — silently inflated headline metrics by a large margin.

### The Bug

The `uid_prior_fraud_rate` feature was designed to capture a user's historical fraud rate using an expanding window:

```python
df["uid_prior_fraud_rate"] = (
    grouped["isFraud"]
    .apply(lambda x: x.expanding().mean().shift(1))
    .reset_index(level=0, drop=True)
)
```

The `shift(1)` correctly excluded the *current* row, but the feature implicitly assumed that the `isFraud` label for transaction N-1 was **instantaneously known** at the moment transaction N was processed. In reality, fraud labels come from bank chargebacks that lag by weeks or months. This constituted classic **target leakage** — we were peeking into the future.

### Impact

We surgically dropped `uid_prior_fraud_rate` (ranked #4 in feature importance, gain = 0.0324) and completely retrained and recalibrated the pipeline. The metrics proved exactly how much this single feature was inflating performance:

| Metric | With Leakage | Without Leakage (Clean) | Delta |
|---|---|---|---|
| **ROC-AUC** | 0.9333 | 0.8926 | -0.0407 |
| **PR-AUC** | 0.6445 | 0.4968 | -0.1477 |
| **Threshold (Scenario A)** | 0.0033 | 0.0039 | +0.0006 |
| **Review Rate** | 46.97% | 52.53% | +5.56% |

A PR-AUC drop from 0.64 to 0.49 is massive, but it represents reality. If deployed, the original model's production performance would have cratered because `uid_prior_fraud_rate` would have been populated with missing or heavily delayed data. Catching this during audit preserved the pipeline's integrity.

---

## 2. Train/Serve Skew in Categorical Encoding

**Discovered during:** Manual audit of the feature importance list.  
**Severity:** Critical — categoricals were silently useless in production.

### The Bug

Two independent failures compounded:

1. **Scrambled mappings during training.** The `encode_categoricals()` function applied `.astype("category").cat.codes` independently to the train, val, and test dataframes *after* splitting. Because `.cat.codes` assigns integers alphabetically based on the unique values in each specific dataframe, the mappings were inconsistent across splits. `debit` could map to `0` in train but `1` in val. XGBoost was evaluating on a scrambled mapping.

2. **Silent failure at live inference.** In `api/routes/score.py`, no `.cat.codes` was applied at all. When casting JSON strings to float (`float(txn_data["card6"])`), it threw a `ValueError` for values like `"debit"`. A silent `try/except` block caught this and defaulted the feature to `0.0`. Any categorical predictive power seen during evaluation was physically impossible to replicate in production.

### The Fix

- Replaced split-dependent `.cat.codes` with a custom `CategoricalEncoder` fitted on training data only, persisted as `categorical_encoder.joblib`.
- Unseen categories are explicitly mapped to `-1` (UNKNOWN) during inference.
- Removed the silent `try/except` — invalid types now fail loudly with HTTP 422, ensuring corrupted data is never silently scored.

---

## 3. The 462-Feature vs. 22-Feature Portability Gap

**Discovered during:** First attempt to wire the model to the live dashboard form.  
**Severity:** Architectural — the production model literally could not run on user input.

### The Problem

The v1.0.0 model achieved ROC-AUC 0.90 and PR-AUC 0.51 using 462 features — but 339 of those were the proprietary, anonymized V-columns from the IEEE-CIS dataset. These columns have no documentation, no known derivation method, and cannot be computed from raw transaction data. The model was scientifically strong but **operationally dead**: a user submitting a form with amount, card type, and email domain could never provide V258, V70, or V294.

### The Fix

We built v2.0.1 from scratch — a separate model trained exclusively on 20 features engineered from 7 predictor fields (TransactionDT, TransactionAmt, ProductCD, card1, card4, card6, P_emaildomain). Performance dropped to ROC-AUC 0.81 and PR-AUC 0.17, which we documented transparently. This is a deliberate, honest tradeoff: the live model is weaker but actually works on real input. The 462-feature model is retained as an archived research reference.

---

## 4. Frontend Deployment Crashes on Render

**Discovered during:** Production deployment — the live URL returned a blank page.  
**Severity:** High — the entire frontend was invisible in production.

### The Problem

Three issues compounded:

1. **`.gitignore` rules blocked the frontend build.** The root `.gitignore` contained `dist/` (meant for Python build artifacts), which also matched `frontend/dist/`. The built React assets were never committed, so the Docker container on Render had an empty `frontend/dist/` directory. FastAPI's `StaticFiles` mount silently served nothing.

2. **Asset filenames change on every build.** Vite generates hashed filenames like `index-D7Vv-vQS.js`. Each rebuild produces new hashes. If we committed old assets but the `index.html` referenced new hashes, the page loaded with 404 errors for every JS and CSS file.

3. **Force-adding wasn't enough.** Even after `git add -f frontend/dist/`, subsequent commits would ignore new builds unless we also un-ignored the path in `.gitignore`.

### The Fix

- Added `!frontend/dist/` to `.gitignore` to permanently un-ignore the frontend build directory.
- Established a build-then-force-add workflow: every frontend change is followed by `npm run build` and `git add -f frontend/dist/assets/` before committing.
- Verified on Render that the deployed container serves the correct hashed assets.

---

## 5. Groq LLM Model Deprecation

**Discovered during:** Evidence generation endpoint returning 500 errors.  
**Severity:** Medium — the evidence agent was completely non-functional.

### The Problem

The evidence agent was configured to use `llama-3.3-70b-versatile` on Groq. Groq deprecated this model without advance warning, causing every `POST /evidence/{id}` call to fail with a model-not-found error. Because the model name was hardcoded, the entire evidence pipeline went down.

### The Fix

- Switched to `openai/gpt-oss-120b` (a currently supported Groq-hosted model).
- Centralized the model name in `src/config.py` as `GROQ_MODEL` so future model swaps require a single line change.

---

## 6. `amt_is_round` Feature Dominance (Robustness Concern)

**Discovered during:** v2.0 feature importance analysis.  
**Severity:** Medium — the model's top feature was an artifact of synthetic data generation, not a real fraud signal.

### The Problem

In the first iteration of v2, the feature `amt_is_round` (a boolean for whether the transaction amount was a whole number like $100.00) had a feature importance of 0.34 — dominating all other features by a large margin. This is a known artifact of how the IEEE-CIS dataset generated transaction amounts, not a generalizable real-world fraud signal. Deploying a model that relies on "is the amount round?" as its primary decision driver would be fragile and misleading.

### The Fix

- Dropped `amt_is_round` and retrained as v2.0.1.
- PR-AUC shifted by only 0.004 (noise level), confirming the remaining 20 features carry real, non-artifact signal.
- This robustness check is documented in the README and evaluation report.

---

## Key Takeaway

Every one of these failures was caught *before* it could affect a production decision. The common thread is that **evaluation metrics alone are not sufficient** — you must audit the code path from raw input to final output, verify that training-time assumptions hold at inference time, and test the deployed artifact, not just the local one.
