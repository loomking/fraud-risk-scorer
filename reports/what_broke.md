# What Broke — Development Failures Log

> Document genuine development failures (Section 36). Must be consistent with Git history.

## 1. Calibration API Change (sklearn 1.9)

- **Date:** 2026-08-30
- **What happened:** `CalibratedClassifierCV(cv="prefit")` raised `InvalidParameterError` — sklearn 1.9 removed the `cv="prefit"` option.
- **Root cause:** The `cv="prefit"` parameter was deprecated in sklearn 1.6 and removed in 1.9. Our `pyproject.toml` specified `scikit-learn>=1.5.2` which resolved to 1.9.0.
- **How detected:** Phase 2 pipeline crashed at the calibration step with a clear error message.
- **How fixed:** Replaced `CalibratedClassifierCV` with manual isotonic regression (`sklearn.isotonic.IsotonicRegression`) wrapped in a custom `CalibratedModelWrapper` class that provides the same `predict_proba()` interface.
- **Validation:** Brier score improved from 0.0362 (uncalibrated) to 0.0136 (calibrated), confirming calibration works correctly. All 48 tests pass.

## 2. Parquet Engine Missing

- **Date:** 2026-08-30
- **What happened:** `save_splits()` crashed with `ImportError: Unable to find a usable engine; tried using: 'pyarrow', 'fastparquet'`.
- **Root cause:** `pyarrow` was not in `pyproject.toml` dependencies. The `pandas.to_parquet()` call requires either pyarrow or fastparquet.
- **How detected:** Phase 1 pipeline completed feature engineering successfully but failed at the split persistence step.
- **How fixed:** Added `pyarrow>=25.0.1` to dependencies via `uv add pyarrow`.
- **Validation:** Re-ran Phase 1, splits saved correctly as parquet files.

## 3. Unicode Encoding on Windows

- **Date:** 2026-08-30
- **What happened:** Eval report generation failed with `UnicodeEncodeError: 'charmap' codec can't encode character '\u20b9'` (₹ symbol).
- **Root cause:** Windows default encoding is cp1252, which doesn't include the ₹ symbol. `Path.write_text()` without explicit encoding uses the system default.
- **How detected:** Phase 2 pipeline completed all model training and evaluation but crashed at report generation.
- **How fixed:** Added `encoding="utf-8"` to `output_path.write_text(report, encoding="utf-8")`.
- **Validation:** Report generated successfully with ₹ symbols intact.
