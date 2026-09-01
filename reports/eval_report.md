# Fraud Risk Scorer — Evaluation Report

> Generated programmatically at 2026-08-31T08:46:54.994091Z
> Every metric below is reproducible from repository code.

## Model Information

| Property | Value |
|---|---|
| Model | XGBoost |
| Primary Reference Model Version (462 features) | v1.0.0 (Research/Offline) |
| Live-serving Demo Model Version (22 features) | v2.0.1 (Live `/score` endpoint) |
| Feature Pipeline Version | v1.0.0 (Full) / v2.0.1 (Live) |
| Calibration Version | v1.0.0 / v2.0.1 |
| Threshold Config Version | v1.0.0 / v2.0.1 |
| Feature Count | 462 |
| Split | Temporal (70/15/15, chronological) |

## Headline Metrics (Test Set)

| Metric | Value |
|---|---|
| **PR-AUC** | **0.5064** |
| ROC-AUC | 0.9010 |
| Precision | 0.0587 |
| Recall | 0.9595 |
| F1 | 0.1107 |
| Brier Score | 0.0225 |

## Confusion Matrix (Test Set, threshold=0.0038)

|  | Predicted Legit | Predicted Fraud |
|---|---|---|
| **Actual Legit** | TN=38101 | FP=47397 |
| **Actual Fraud** | FN=125 | TP=2958 |

## Business Metrics (Test Set)

| Metric | Value |
|---|---|
| Threshold | 0.0038 |
| Fraud Capture Rate | 0.9595 |
| Review Rate | 0.5685 |
| FP Cost Assumption (₹) | 50 |
| FN Cost Assumption (₹) | 12536 |
| Expected Cost/1000 txns (₹) | 44444 |

> **Note:** FP and FN costs are illustrative assumptions, NOT researched facts.

## Threshold Sensitivity Analysis (Validation Set, Section 17)

> Sensitivity analysis computed on validation set (threshold selection must not use test data).

| FP Cost (₹) | Optimal Threshold | Review Rate | Fraud Capture | Cost/1000 txns (₹) |
|---|---|---|---|---|
| ₹25 | 0.0017 | 0.747 | 0.990 | ₹22070 |
| ₹50 | 0.0038 | 0.575 | 0.977 | ₹36845 |
| ₹100 | 0.0076 | 0.437 | 0.951 | ₹61644 |

## Calibration (Section 15)

| Property | Value |
|---|---|
| Method | isotonic |
| Brier (uncalibrated) | 0.0603 |
| Brier (calibrated) | 0.0214 |
| Improvement | 0.0390 |

## Top 20 Feature Importance

| Rank | Feature | Importance |
|---|---|---|
| 1 | V258 | 0.1169 |
| 2 | V70 | 0.0648 |
| 3 | V257 | 0.0558 |
| 4 | V294 | 0.0336 |
| 5 | V201 | 0.0299 |
| 6 | V91 | 0.0250 |
| 7 | C8 | 0.0191 |
| 8 | V308 | 0.0139 |
| 9 | V187 | 0.0139 |
| 10 | C14 | 0.0119 |
| 11 | card6 | 0.0103 |
| 12 | V283 | 0.0102 |
| 13 | C4 | 0.0097 |
| 14 | V312 | 0.0083 |
| 15 | addr2 | 0.0077 |
| 16 | C5 | 0.0075 |
| 17 | V336 | 0.0067 |
| 18 | addr2_freq | 0.0062 |
| 19 | V317 | 0.0059 |
| 20 | M4 | 0.0056 |

## Data Split

| Split | Rows | Fraud Count | Fraud % | DT Range |
|---|---|---|---|---|
| Train | 413378 | 14538 | 3.52% | 86400–10437996 |
| Val | 88581 | 3042 | 3.43% | 10438003–13151840 |
| Test | 88581 | 3083 | 3.48% | 13151880–15811131 |

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
