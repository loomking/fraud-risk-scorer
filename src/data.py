"""
Dataset loading, validation, and temporal splitting.

Implements Section 5.4 (dataset validation), Section 8 (sorting),
Section 9 (temporal splitting), and Section 5.3 (identity join).
"""

import logging
from pathlib import Path

import numpy as np
import pandas as pd

from src.config import (
    DATA_PROCESSED_DIR,
    EXPECTED_IDENTITY_ROWS,
    EXPECTED_TRANSACTION_ROWS,
    REQUIRED_IDENTITY_COLUMNS,
    REQUIRED_TRANSACTION_COLUMNS,
    TEST_RATIO,
    TRAIN_RATIO,
    TRAIN_TRANSACTION_FILE,
    TRAIN_IDENTITY_FILE,
    VAL_RATIO,
)

logger = logging.getLogger(__name__)


# ── Dataset Validation (Section 5.4) ─────────────────────────────────────────

def validate_dataset_files() -> None:
    """Verify dataset files exist and are not truncated. Fail loudly."""
    for path, label in [
        (TRAIN_TRANSACTION_FILE, "train_transaction.csv"),
        (TRAIN_IDENTITY_FILE, "train_identity.csv"),
    ]:
        if not path.exists():
            raise FileNotFoundError(
                f"Required dataset file missing: {path}\n"
                f"Run: bash data/download_data.sh"
            )
        if path.stat().st_size < 1_000:
            raise ValueError(f"Dataset file appears truncated: {path} ({path.stat().st_size} bytes)")
        logger.info(f"  ✓ {label} exists ({path.stat().st_size / 1e6:.1f} MB)")


def validate_dataframe(df: pd.DataFrame, required_cols: list[str],
                       expected_rows: int, label: str,
                       tolerance: float = 0.01) -> None:
    """Validate a loaded DataFrame has expected columns and approximate row count."""
    missing_cols = set(required_cols) - set(df.columns)
    if missing_cols:
        raise ValueError(f"{label}: missing required columns: {missing_cols}")

    row_count = len(df)
    lower = int(expected_rows * (1 - tolerance))
    upper = int(expected_rows * (1 + tolerance))
    if not (lower <= row_count <= upper):
        raise ValueError(
            f"{label}: expected ~{expected_rows} rows, got {row_count} "
            f"(outside tolerance {lower}-{upper})"
        )
    logger.info(f"  ✓ {label}: {row_count} rows, {len(df.columns)} columns")


# ── Data Loading ──────────────────────────────────────────────────────────────

def load_raw_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load and validate raw transaction and identity CSVs."""
    logger.info("Validating dataset files...")
    validate_dataset_files()

    logger.info("Loading train_transaction.csv...")
    df_txn = pd.read_csv(TRAIN_TRANSACTION_FILE)
    validate_dataframe(df_txn, REQUIRED_TRANSACTION_COLUMNS,
                       EXPECTED_TRANSACTION_ROWS, "train_transaction")

    logger.info("Loading train_identity.csv...")
    df_id = pd.read_csv(TRAIN_IDENTITY_FILE)
    validate_dataframe(df_id, REQUIRED_IDENTITY_COLUMNS,
                       EXPECTED_IDENTITY_ROWS, "train_identity")

    # Verify TransactionID is the join key and is unique in transactions
    if df_txn["TransactionID"].duplicated().any():
        raise ValueError("TransactionID has duplicates in train_transaction — cannot be a primary key")

    return df_txn, df_id


def join_transaction_identity(df_txn: pd.DataFrame, df_id: pd.DataFrame) -> pd.DataFrame:
    """
    Left join transactions with identity data (Section 5.3).

    Only ~24% of transactions have identity records.
    Creates `has_identity` boolean feature — does NOT drop unmatched rows.
    """
    df = df_txn.merge(df_id, on="TransactionID", how="left")

    # Section 5.3: explicit boolean feature for identity availability
    df["has_identity"] = df["DeviceType"].notna()

    matched = df["has_identity"].sum()
    total = len(df)
    pct = matched / total * 100
    logger.info(f"  Identity join: {matched}/{total} matched ({pct:.1f}%)")

    if pct < 10 or pct > 50:
        logger.warning(f"  ⚠ Identity match rate {pct:.1f}% is outside expected ~24% range")

    return df


# ── Sorting (Section 8) ──────────────────────────────────────────────────────

def sort_by_time(df: pd.DataFrame) -> pd.DataFrame:
    """Sort by TransactionDT for chronological ordering. Preserves index reset."""
    return df.sort_values("TransactionDT", kind="mergesort").reset_index(drop=True)


# ── Temporal Splitting (Section 9) ────────────────────────────────────────────

def temporal_split(
    df: pd.DataFrame,
    train_ratio: float = TRAIN_RATIO,
    val_ratio: float = VAL_RATIO,
    test_ratio: float = TEST_RATIO,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Chronological split: earliest ~70% → train, next ~15% → val, final ~15% → test.

    The DataFrame MUST be sorted by TransactionDT before calling this function.
    Uses deterministic index-based splitting — no randomness anywhere.

    Returns (train_df, val_df, test_df) with non-overlapping time ranges.
    """
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-9, \
        f"Split ratios must sum to 1.0, got {train_ratio + val_ratio + test_ratio}"

    n = len(df)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    train_df = df.iloc[:train_end].copy()
    val_df = df.iloc[train_end:val_end].copy()
    test_df = df.iloc[val_end:].copy()

    # ── Verify chronological correctness ──────────────────────────────────
    assert train_df["TransactionDT"].max() <= val_df["TransactionDT"].min(), \
        "LEAKAGE: train max TransactionDT > val min TransactionDT"
    assert val_df["TransactionDT"].max() <= test_df["TransactionDT"].min(), \
        "LEAKAGE: val max TransactionDT > test min TransactionDT"

    # ── Log split details (Checkpoint 1 info) ─────────────────────────────
    for name, split_df in [("TRAIN", train_df), ("VAL", val_df), ("TEST", test_df)]:
        fraud_count = split_df["isFraud"].sum()
        fraud_pct = fraud_count / len(split_df) * 100
        logger.info(
            f"  {name}: {len(split_df)} rows | "
            f"TransactionDT [{split_df['TransactionDT'].min()} – {split_df['TransactionDT'].max()}] | "
            f"Fraud: {fraud_count} ({fraud_pct:.2f}%)"
        )

    return train_df, val_df, test_df


def verify_split_integrity(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    original_len: int,
) -> dict:
    """
    Comprehensive split verification (Checkpoint 1 requirements).

    Returns a dict with all checkpoint information.
    """
    report = {
        "total_rows": original_len,
        "train_rows": len(train_df),
        "val_rows": len(val_df),
        "test_rows": len(test_df),
        "rows_accounted": len(train_df) + len(val_df) + len(test_df),
        "train_dt_min": int(train_df["TransactionDT"].min()),
        "train_dt_max": int(train_df["TransactionDT"].max()),
        "val_dt_min": int(val_df["TransactionDT"].min()),
        "val_dt_max": int(val_df["TransactionDT"].max()),
        "test_dt_min": int(test_df["TransactionDT"].min()),
        "test_dt_max": int(test_df["TransactionDT"].max()),
        "no_overlap_train_val": train_df["TransactionDT"].max() <= val_df["TransactionDT"].min(),
        "no_overlap_val_test": val_df["TransactionDT"].max() <= test_df["TransactionDT"].min(),
        "no_random_split": True,  # By construction: index-based on sorted df
        "train_fraud_count": int(train_df["isFraud"].sum()),
        "val_fraud_count": int(val_df["isFraud"].sum()),
        "test_fraud_count": int(test_df["isFraud"].sum()),
        "train_fraud_pct": float(train_df["isFraud"].mean() * 100),
        "val_fraud_pct": float(val_df["isFraud"].mean() * 100),
        "test_fraud_pct": float(test_df["isFraud"].mean() * 100),
    }

    # Assertions
    assert report["rows_accounted"] == original_len, \
        f"Row count mismatch: {report['rows_accounted']} != {original_len}"
    assert report["no_overlap_train_val"], "Train/val TransactionDT ranges overlap!"
    assert report["no_overlap_val_test"], "Val/test TransactionDT ranges overlap!"

    return report


# ── Dev Subset (Section 4.3) ─────────────────────────────────────────────────

def get_dev_subset(df: pd.DataFrame, n: int = 30_000) -> pd.DataFrame:
    """
    Return the first N rows of a time-sorted DataFrame for fast iteration.

    Must preserve chronological ordering. Never use random sampling.
    If <50 positives, caller should increase n.
    """
    assert (df["TransactionDT"].diff().dropna() >= 0).all(), \
        "DataFrame must be sorted by TransactionDT before taking dev subset"

    subset = df.head(n).copy()
    fraud_count = subset["isFraud"].sum()

    if fraud_count < 50:
        logger.warning(
            f"  ⚠ Dev subset ({n} rows) has only {fraud_count} fraud cases. "
            f"Consider increasing subset size for meaningful precision/recall checks."
        )

    logger.info(f"  Dev subset: {len(subset)} rows, {fraud_count} fraud cases")
    return subset


# ── Persistence ───────────────────────────────────────────────────────────────

def save_splits(train_df: pd.DataFrame, val_df: pd.DataFrame, test_df: pd.DataFrame,
                output_dir: Path | None = None) -> None:
    """Save train/val/test splits as parquet files for reproducibility."""
    out = output_dir or DATA_PROCESSED_DIR
    out.mkdir(parents=True, exist_ok=True)

    train_df.to_parquet(out / "train.parquet", index=False)
    val_df.to_parquet(out / "val.parquet", index=False)
    test_df.to_parquet(out / "test.parquet", index=False)
    logger.info(f"  Splits saved to {out}/")


def load_splits(input_dir: Path | None = None) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load previously saved splits."""
    inp = input_dir or DATA_PROCESSED_DIR
    train_df = pd.read_parquet(inp / "train.parquet")
    val_df = pd.read_parquet(inp / "val.parquet")
    test_df = pd.read_parquet(inp / "test.parquet")
    return train_df, val_df, test_df
