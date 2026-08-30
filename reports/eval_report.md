# Fraud Risk Scorer — Evaluation Report

> Generated programmatically at 2026-08-30T16:57:30.274301Z
> Every metric below is reproducible from repository code.

## Model Information

| Property | Value |
|---|---|
| Model | XGBoost |
| Model Version | v1.0.0 |
| Feature Pipeline Version | v1.0.0 |
| Calibration Version | v1.0.0 |
| Threshold Config Version | v1.0.0 |
| Feature Count | 463 |
| Split | Temporal (70/15/15, chronological) |

## Headline Metrics (Test Set)

| Metric | Value |
|---|---|
| **PR-AUC** | **0.6591** |
| ROC-AUC | 0.9482 |
| Precision | 0.1404 |
| Recall | 0.9034 |
| F1 | 0.2430 |
| Brier Score | 0.0160 |

## Confusion Matrix (Test Set, threshold=0.0149)

|  | Predicted Legit | Predicted Fraud |
|---|---|---|
| **Actual Legit** | TN=3553 | FP=802 |
| **Actual Fraud** | FN=14 | TP=131 |

## Business Metrics (Test Set)

| Metric | Value |
|---|---|
| Threshold | 0.0149 |
| Fraud Capture Rate | 0.856 |
| Review Rate | 0.182 |
| FP Cost Assumption (₹) | 50 |
| FN Cost Assumption (₹) | 3000 |
| Expected Cost/1000 txns (₹) | 18700 |

> **Note:** FP and FN costs are illustrative assumptions, NOT researched facts.

## Threshold Sensitivity Analysis (Section 17)

| FP Cost (₹) | Optimal Threshold | Review Rate | Fraud Capture | Cost/1000 txns (₹) |
|---|---|---|---|---|
| ₹25 | 0.0100 | 0.299 | 0.919 | ₹12906 |
| ₹50 | 0.0149 | 0.182 | 0.856 | ₹18700 |
| ₹100 | 0.0297 | 0.117 | 0.784 | ₹25733 |

## Calibration (Section 15)

| Property | Value |
|---|---|
| Method | isotonic |
| Brier (uncalibrated) | 0.0362 |
| Brier (calibrated) | 0.0136 |
| Improvement | 0.0226 |

## Top 20 Feature Importance

| Rank | Feature | Importance |
|---|---|---|
| 1 | V140 | 0.0321 |
| 2 | V139 | 0.0294 |
| 3 | uid_prior_fraud_rate | 0.0255 |
| 4 | V171 | 0.0241 |
| 5 | V258 | 0.0239 |
| 6 | C5 | 0.0165 |
| 7 | card3 | 0.0165 |
| 8 | card6_freq | 0.0165 |
| 9 | V271 | 0.0163 |
| 10 | C8 | 0.0145 |
| 11 | V253 | 0.0127 |
| 12 | V317 | 0.0123 |
| 13 | V230 | 0.0122 |
| 14 | V283 | 0.0106 |
| 15 | R_emaildomain | 0.0095 |
| 16 | V201 | 0.0093 |
| 17 | V30 | 0.0084 |
| 18 | C2 | 0.0083 |
| 19 | V70 | 0.0080 |
| 20 | V126 | 0.0078 |

## Data Split

| Split | Rows | Fraud Count | Fraud % | DT Range |
|---|---|---|---|---|
| Train | 21000 | 604 | 2.88% | 86400–534378 |
| Val | 4500 | 111 | 2.47% | 534391–663352 |
| Test | 4500 | 145 | 3.22% | 663356–757979 |

## Real vs Synthetic Components (Section 19)

| Component | Type |
|---|---|
| Transaction data | Real (IEEE-CIS) |
| Trained model | Real (XGBoost on IEEE-CIS) |
| Feature engineering | Real (computed from data) |
| Evaluation metrics | Real (computed on held-out test set) |
| Business cost assumptions | Illustrative (NOT researched facts) |
| Evidence narratives | AI-generated (LLM) |
| Audit trail | Real (database records) |

## Limitations (Section 45)

- Dataset is anonymized/masked (IEEE-CIS Fraud Detection)
- TransactionDT is a relative offset, not a real-world timestamp
- Synthetic UID constructed from card1+addr1+D1 (approximation)
- Business costs are estimated, not researched
- LLM evidence is AI-generated wording, not independently verified
- SQLite used for development (not production-grade)
- No authentication in hackathon MVP
