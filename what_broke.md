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

# Failure Story 4: Train/Serve Skew in Categorical Encoding

While manually auditing why `card6` appeared in the top-20 feature importance list despite not having a frequency encoding, we uncovered a severe bug in our categorical handling that caused both train/test leakage and a silent failure during live inference.

## The Bug: Three Separate Mappings and a Silent Failure

1. **Scrambled Mappings During Training**: Our `encode_categoricals()` function was independently applying `.astype("category").cat.codes` to the `train`, `val`, and `test` dataframes after the temporal split. Because `.cat.codes` maps strings to integers alphabetically based solely on the unique values present in that specific dataframe, the integer mapping was entirely inconsistent across splits. For instance, `debit` could map to `0` in train but `1` in val. XGBoost was evaluating on a scrambled mapping.
2. **Total Failure at Live Inference**: In `api/routes/score.py`, the backend did not even apply `.cat.codes`. When casting the incoming JSON string to float (`float(txn_data["card6"])`), it naturally threw a `ValueError` for values like `"debit"`. A silent `try/except` block caught this and left the feature at `0.0`. Thus, any categorical predictive power seen during evaluation was physically impossible to replicate in production.

## The Fix: Single Source of Truth

We deprecated the split-dependent `.cat.codes` approach and implemented a custom `CategoricalEncoder`.
- **Fit on Train Only**: The encoder strictly learns unique categories from the training split.
- **Artifact Persistence**: It serializes this mapping dictionary to `categorical_encoder.joblib`.
- **Deterministic Fallback**: During validation, testing, and live inference, unseen categories are explicitly mapped to `-1` (UNKNOWN).
- **Loud Failures**: The silent `try/except` around float casting in `score.py` was removed. If an inherently invalid type is sent for a numerical field, the API fails loudly (HTTP 500/422) and logs the error, ensuring we never silently score corrupted data again.

By checking the exact code path rather than just the evaluation metrics, we identified and eliminated a bug that would have rendered base categoricals like `card4` and `card6` useless in production.
