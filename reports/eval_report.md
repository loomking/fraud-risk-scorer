# Fraud Risk Scorer — Evaluation Report

> Generated programmatically at 2026-08-31T08:08:03.705135Z
> Every metric below is reproducible from repository code.

## Model Information

| Property | Value |
|---|---|
| Model | XGBoost |
| Model Version | v1.0.0 |
| Feature Pipeline Version | v1.0.0 |
| Calibration Version | v1.0.0 |
| Threshold Config Version | v1.0.0 |
| Feature Count | 462 |
| Split | Temporal (70/15/15, chronological) |

## Headline Metrics (Test Set)

| Metric | Value |
|---|---|
| **PR-AUC** | **0.4968** |
| ROC-AUC | 0.8926 |
| Precision | 0.0628 |
| Recall | 0.9471 |
| F1 | 0.1177 |
| Brier Score | 0.0226 |

## Confusion Matrix (Test Set, threshold=0.0039)

|  | Predicted Legit | Predicted Fraud |
|---|---|---|
| **Actual Legit** | TN=41892 | FP=43606 |
| **Actual Fraud** | FN=163 | TP=2920 |

## Business Metrics (Test Set)

> **Scenario A (Headline):** FN Cost derived from MEAN fraud amount (₹12,536).
> **Scenario B:** FN Cost derived from MEDIAN fraud amount (₹6,300).
>
> **CRITICAL DEPLOYMENT NOTE:** Scenario A (mean-based, threshold 0.0039) is the frozen threshold actually deployed in the live system. Scenario B (median-based) is presented as a comparative analysis, not currently active.
>
> *Note on Review Rate:* The 0.5252 (52.52%) review rate in Scenario A reflects the outsized influence of the mean fraud amount, which is highly sensitive to a small number of catastrophic fraud transactions; the median-based Scenario B produces a materially lower, more operationally realistic review rate (0.4712).

| Metric | Scenario A (Mean, ₹12536 FN) | Scenario B (Median, ₹6300 FN) |
|---|---|---|
| Threshold | 0.0039 (Frozen) | 0.0079 |
| Fraud Capture Rate (Test) | 0.9471 | 0.9355 |
| Review Rate (Test) | 0.5252 | 0.4712 |
| FP Cost Assumption (₹) | 50 | 50 |
| FN Cost Assumption (₹) | 12536 | 6300 |

> **Note:** Dataset currency is assumed to be USD (1 USD = 84.00 INR, August 2026).
## Threshold Sensitivity Analysis (Validation Set, Section 17)

> Sensitivity analysis computed on validation set (threshold selection must not use test data).

| FP Cost (₹) | Optimal Threshold | Review Rate | Fraud Capture | Cost/1000 txns (₹) |
|---|---|---|---|---|
| ₹25 | 0.0019 | 0.681 | 0.988 | ₹21275 |
| ₹50 | 0.0039 | 0.562 | 0.975 | ₹37032 |
| ₹100 | 0.0079 | 0.505 | 0.963 | ₹63286 |

## Calibration (Section 15)

| Property | Value |
|---|---|
| Method | isotonic |
| Brier (uncalibrated) | 0.0688 |
| Brier (calibrated) | 0.0220 |
| Improvement | 0.0468 |

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
