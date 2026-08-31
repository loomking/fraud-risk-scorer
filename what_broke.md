# Failure Story: Target Leakage in `uid_prior_fraud_rate`

During a manual audit of the feature set, we identified a critical flaw in `uid_prior_fraud_rate` that was artificially inflating our headline ROC-AUC and PR-AUC metrics.

## The Bug: Immediate Label Availability

The `uid_prior_fraud_rate` feature was designed to capture a user's historical fraud rate by looking at their past transactions. The implementation was:

```python
df["uid_prior_fraud_rate"] = (
    grouped["isFraud"]
    .apply(lambda x: x.expanding().mean().shift(1))
    .reset_index(level=0, drop=True)
)
```

This implicitly assumed that the `isFraud` label for transaction N-1 was instantaneously known at the exact millisecond transaction N was processed. In the real world of payments, fraud reporting (via bank chargebacks) typically lags by weeks or months. 

This constituted a classic form of **target leakage** or an overly optimistic temporal assumption. We were effectively cheating by peeking into the future to know if a user's *recent* transactions were fraud before the issuing bank would realistically have reported it.

## The Impact (Before vs After)

We surgically dropped `uid_prior_fraud_rate` (which was ranked #4 in feature importance with a gain of 0.0324) and completely retrained and recalibrated the XGBoost pipeline.

The results proved exactly how much this single leaked feature was inflating the model's perceived performance:

| Metric | With Leakage (Old) | Without Leakage (New, Clean) | Delta |
|---|---|---|---|
| **ROC-AUC** | 0.9333 | 0.8926 | 📉 -0.0407 |
| **PR-AUC** | 0.6445 | 0.4968 | 📉 -0.1477 |
| **Threshold (Scenario A)** | 0.0033 | 0.0039 | 📈 +0.0006 |
| **Review Rate (Scenario A)** | 46.97% | 52.53% | 📈 +5.56% |

## Why This Matters

A PR-AUC drop from 0.64 to 0.49 is massive, but it represents *reality*. If we had deployed the original model, its production performance would have cratered compared to the test set metrics because the `uid_prior_fraud_rate` feature would have been populated with missing or heavily delayed data in real life.

By catching this target leakage during the audit phase, we preserved the integrity of our pipeline. This is a stronger demonstration of rigor than the feature itself ever was of predictive power.
