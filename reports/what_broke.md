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

## 4. Transaction UNIQUE Constraint on Re-Score

- **Date:** 2026-08-31
- **What happened:** API tests failed with `IntegrityError: UNIQUE constraint failed: transactions.transaction_id` when re-scoring the same transaction.
- **Root cause:** The score endpoint used `db.merge()` which merges by primary key (`id`, auto-increment) — not by the `transaction_id` unique column. On re-runs, it tried to INSERT a new row with the same `transaction_id`.
- **How detected:** Test suite failed on 3/48 tests after the on-disk SQLite DB already contained records from a previous run.
- **How fixed:** Replaced `db.merge()` with explicit upsert: query for existing transaction by `transaction_id`, update if found, insert if not.
- **Validation:** All 48 tests pass on repeated runs.

## 5. Silently Missing Machine Learning Code (.gitignore Failure)

- **Date:** 2026-08-31
- **What happened:** The entire `src/models/` directory (containing all ML logic: training, evaluation, calibration, and thresholding) was completely missing from the git repository. 
- **Root cause:** When configuring `.gitignore` to ignore large model artifacts (like `xgboost_model.joblib`), the rule `models/` was used instead of `/models/`. Git interpreted this as a recursive wildcard, silently ignoring any directory named `models` anywhere in the repository, including `src/models/`.
- **How detected:** ~15 hours after the code was written. The model code was written on August 30 at ~21:40, but when a bug fix to `evaluate.py` was made on August 31 at ~12:40, `git status` failed to show the file as modified. A `git ls-files` check revealed the folder had never been tracked.
- **How fixed:** Changed the `.gitignore` rule to `/models/` to anchor it to the repository root. Ran `git add src/models/` to formally track the ML source code.
- **Validation:** `git ls-files src/models/` now correctly lists the Python scripts, and changes to the ML logic successfully appear in `git status` and commits.
