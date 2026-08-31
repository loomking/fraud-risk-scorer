# Fraud Risk Scorer — Evaluation Report

> Generated programmatically at 2026-08-31T07:30:10.062806Z
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
| **PR-AUC** | **0.6445** |
| ROC-AUC | 0.9333 |
| Precision | 0.0716 |
| Recall | 0.9659 |
| F1 | 0.1333 |
| Brier Score | 0.0181 |

## Confusion Matrix (Test Set, threshold=0.0033)

|  | Predicted Legit | Predicted Fraud |
|---|---|---|
| **Actual Legit** | TN=46866 | FP=38632 |
| **Actual Fraud** | FN=105 | TP=2978 |

## Business Metrics (Test Set)

| Metric | Value |
|---|---|
| Threshold | 0.0033 |
| Fraud Capture Rate | 0.9659 |
| Review Rate | 0.4697 |
| FP Cost Assumption (₹) | 50 |
| FN Cost Assumption (₹) | 12536 |
| Expected Cost/1000 txns (₹) | 36666 |

> **Note:** FP and FN costs are illustrative assumptions, NOT researched facts.

## Threshold Sensitivity Analysis (Validation Set, Section 17)

> Sensitivity analysis computed on validation set (threshold selection must not use test data).

| FP Cost (₹) | Optimal Threshold | Review Rate | Fraud Capture | Cost/1000 txns (₹) |
|---|---|---|---|---|
| ₹25 | 0.0018 | 0.609 | 0.990 | ₹18771 |
| ₹50 | 0.0033 | 0.501 | 0.980 | ₹32130 |
| ₹100 | 0.0075 | 0.366 | 0.957 | ₹51989 |

## Calibration (Section 15)

| Property | Value |
|---|---|
| Method | isotonic |
| Brier (uncalibrated) | 0.0567 |
| Brier (calibrated) | 0.0168 |
| Improvement | 0.0399 |

## Top 20 Feature Importance

| Rank | Feature | Importance |
|---|---|---|
| 1 | V258 | 0.0712 |
| 2 | V187 | 0.0616 |
| 3 | V257 | 0.0512 |
| 4 | uid_prior_fraud_rate | 0.0324 |
| 5 | V70 | 0.0298 |
| 6 | V294 | 0.0268 |
| 7 | V91 | 0.0254 |
| 8 | C8 | 0.0151 |
| 9 | V95 | 0.0113 |
| 10 | V69 | 0.0111 |
| 11 | card6_freq | 0.0110 |
| 12 | C14 | 0.0110 |
| 13 | V244 | 0.0104 |
| 14 | V243 | 0.0102 |
| 15 | V201 | 0.0101 |
| 16 | V30 | 0.0082 |
| 17 | V317 | 0.0074 |
| 18 | C4 | 0.0069 |
| 19 | card6 | 0.0068 |
| 20 | V315 | 0.0066 |

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
