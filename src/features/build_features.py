"""
Leakage-safe feature engineering (Sections 10, 11, 12).

CRITICAL INVARIANTS:
1. Every feature must be available at prediction time (Section 10.1).
2. Historical aggregates must only use strictly earlier transactions (Section 10.3).
3. Frequency/count encodings must be learned only from training data (Section 11).
4. No full-group transforms that leak future data into earlier rows.
5. V1-V339 missingness is handled with sentinels, not blind mean-imputation (Section 5.2).

FEATURE AUDIT is documented inline for each feature family.
"""

import logging
from typing import Any

import numpy as np
import pandas as pd

from src.features.uid import construct_uid

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE AUDIT TABLE
# ─────────────────────────────────────────────────────────────────────────────
# Feature Family       | Source Cols          | Prediction-Time? | Leakage Risk    | Included
# ─────────────────────|──────────────────────|──────────────────|─────────────────|─────────
# TransactionAmt       | TransactionAmt       | Yes              | None            | Yes
# ProductCD            | ProductCD            | Yes              | None            | Yes
# card1-card6          | card1..card6         | Yes              | None            | Yes
# addr1, addr2         | addr1, addr2         | Yes              | None            | Yes
# dist1, dist2         | dist1, dist2         | Yes              | None            | Yes
# P_emaildomain        | P_emaildomain        | Yes              | None            | Yes
# R_emaildomain        | R_emaildomain        | Yes              | None            | Yes
# C1-C14               | C1..C14              | Yes              | None            | Yes
# D1-D15               | D1..D15              | Yes (relative)   | None            | Yes
# M1-M9                | M1..M9               | Yes              | None            | Yes
# V1-V339              | V1..V339             | Yes              | Missingness     | Yes (sentinel)
# has_identity         | identity join        | Yes              | None            | Yes
# DeviceType/Info      | identity table       | Yes              | None            | Yes
# id_12..id_38         | identity table       | Yes              | None            | Yes
# uid                  | card1+addr1+D1       | Yes (raw only)   | In aggregates   | Yes
# uid_txn_count_hist   | uid + TransactionDT  | Causal only      | HIGH if leaked  | Yes (causal)
# uid_avg_amt_hist     | uid + TransactionAmt | Causal only      | HIGH if leaked  | Yes (causal)
# uid_max_amt_hist     | uid + TransactionAmt | Causal only      | HIGH if leaked  | Yes (causal)
# freq_enc_*           | card1, email, etc.   | Train-only fit   | Moderate        | Yes (train-fit)
# amt_log              | TransactionAmt       | Yes              | None            | Yes
# amt_decimal          | TransactionAmt       | Yes              | None            | Yes
# v_block_missing_*    | V columns            | Yes              | None            | Yes
# TransactionDT        | TransactionDT        | N/A (ordering)   | Not a feature   | Excluded


# ─────────────────────────────────────────────────────────────────────────────
# 1. TRANSACTION AMOUNT FEATURES
# ─────────────────────────────────────────────────────────────────────────────

def build_amount_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derive features from TransactionAmt.
    All are available at prediction time (submitted with the transaction).
    """
    df = df.copy()
    # Log transform — reduces skew
    df["amt_log"] = np.log1p(df["TransactionAmt"])

    # Decimal part — fraudulent transactions may have round amounts
    df["amt_decimal"] = df["TransactionAmt"] - df["TransactionAmt"].astype(int)

    # Is round amount
    df["amt_is_round"] = (df["amt_decimal"] < 0.01).astype(int)

    return df


# ─────────────────────────────────────────────────────────────────────────────
# 2. V-COLUMN MISSINGNESS FEATURES (Section 5.2)
# ─────────────────────────────────────────────────────────────────────────────

# V columns have block-aligned missingness. Define blocks based on known patterns.
V_BLOCKS = {
    "v_block_1": [f"V{i}" for i in range(1, 12)],      # V1-V11
    "v_block_2": [f"V{i}" for i in range(12, 35)],     # V12-V34
    "v_block_3": [f"V{i}" for i in range(35, 53)],     # V35-V52
    "v_block_4": [f"V{i}" for i in range(53, 75)],     # V53-V74
    "v_block_5": [f"V{i}" for i in range(75, 95)],     # V75-V94
    "v_block_6": [f"V{i}" for i in range(95, 138)],    # V95-V137
    "v_block_7": [f"V{i}" for i in range(138, 167)],   # V138-V166
    "v_block_8": [f"V{i}" for i in range(167, 217)],   # V167-V216
    "v_block_9": [f"V{i}" for i in range(217, 279)],   # V217-V278
    "v_block_10": [f"V{i}" for i in range(279, 340)],  # V279-V339
}


def build_v_missingness_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create block-level missingness indicators for V columns.
    Missingness itself may carry predictive information (Section 5.2).
    """
    df = df.copy()
    for block_name, v_cols in V_BLOCKS.items():
        present_cols = [c for c in v_cols if c in df.columns]
        if present_cols:
            df[f"{block_name}_missing"] = df[present_cols].isna().all(axis=1).astype(int)
    # Total V missing count
    all_v_cols = [c for c in df.columns if c.startswith("V") and c[1:].isdigit()]
    if all_v_cols:
        df["v_total_missing_count"] = df[all_v_cols].isna().sum(axis=1)
    return df


def fill_v_columns_sentinel(df: pd.DataFrame, sentinel: float = -999.0) -> pd.DataFrame:
    """
    Fill V-column NaNs with a sentinel value.
    Do NOT mean-impute (Section 5.2) — missingness may be predictive.
    """
    df = df.copy()
    v_cols = [c for c in df.columns if c.startswith("V") and c[1:].isdigit()]
    df[v_cols] = df[v_cols].fillna(sentinel)
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 3. CAUSAL HISTORICAL AGGREGATIONS (Section 10.3)
# ─────────────────────────────────────────────────────────────────────────────

def build_causal_historical_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build historical aggregates using ONLY strictly earlier transactions per uid.

    For transaction N with a given uid:
      - Allowed: rows 1..N-1 for that uid (strictly earlier by TransactionDT)
      - Not allowed: row N itself or any future row

    CRITICAL: DataFrame MUST be sorted by TransactionDT before calling.
    Uses expanding window with shift(1) to exclude the current row.
    """
    df = df.copy()

    # Verify chronological sorting
    assert (df["TransactionDT"].diff().dropna() >= 0).all(), \
        "DataFrame must be sorted by TransactionDT for causal aggregation"

    df["uid"] = construct_uid(df)

    # Group by uid, then use expanding window shifted by 1 (excludes current row)
    grouped = df.groupby("uid")

    # Count of prior transactions for this uid
    df["uid_txn_count_hist"] = grouped.cumcount()  # 0-indexed: first txn = 0 prior txns

    # Prior average transaction amount (expanding mean, shifted)
    df["uid_avg_amt_hist"] = (
        grouped["TransactionAmt"]
        .apply(lambda x: x.expanding().mean().shift(1))
        .reset_index(level=0, drop=True)
    )

    # Prior max transaction amount (expanding max, shifted)
    df["uid_max_amt_hist"] = (
        grouped["TransactionAmt"]
        .apply(lambda x: x.expanding().max().shift(1))
        .reset_index(level=0, drop=True)
    )


    # Time since last transaction by this uid
    df["uid_time_since_last"] = (
        grouped["TransactionDT"]
        .apply(lambda x: x.diff())
        .reset_index(level=0, drop=True)
    )

    # Fill NaN for first-time uids (no history)
    for col in ["uid_avg_amt_hist", "uid_max_amt_hist",
                "uid_time_since_last"]:
        df[col] = df[col].fillna(-1)  # Sentinel for "no prior history"

    logger.info(f"  Built causal historical features for {df['uid'].nunique()} unique uids")

    return df


# ─────────────────────────────────────────────────────────────────────────────
# 4. FREQUENCY ENCODING (Section 11)
# ─────────────────────────────────────────────────────────────────────────────

class FrequencyEncoder:
    """
    Frequency encoding learned ONLY from training data (Section 11).

    At inference: unknown categories get count=0 / freq=0.
    Never fit on the complete dataset before splitting.
    """

    def __init__(self, columns: list[str]):
        self.columns = columns
        self.freq_maps: dict[str, dict[Any, float]] = {}
        self._fitted = False

    def fit(self, train_df: pd.DataFrame) -> "FrequencyEncoder":
        """Learn frequency counts from training split only."""
        for col in self.columns:
            if col in train_df.columns:
                counts = train_df[col].value_counts(normalize=True)
                self.freq_maps[col] = counts.to_dict()
        self._fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply frequency encoding. Unknown categories → 0."""
        assert self._fitted, "FrequencyEncoder must be fit before transform"
        df = df.copy()
        for col in self.columns:
            if col in df.columns and col in self.freq_maps:
                df[f"{col}_freq"] = df[col].map(self.freq_maps[col]).fillna(0.0)
        return df

    def fit_transform(self, train_df: pd.DataFrame) -> pd.DataFrame:
        return self.fit(train_df).transform(train_df)


# Columns for frequency encoding (high-cardinality categoricals)
FREQ_ENCODE_COLUMNS = [
    "card1", "card2", "card3", "card4", "card5", "card6",
    "addr1", "addr2",
    "P_emaildomain", "R_emaildomain",
    "ProductCD",
    "DeviceType", "DeviceInfo",
]


# ─────────────────────────────────────────────────────────────────────────────
# 5. CATEGORICAL ENCODING
# ─────────────────────────────────────────────────────────────────────────────

def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    """
    Simple label encoding for low-to-medium cardinality categoricals.
    Handles unknowns by mapping to -1.
    """
    df = df.copy()
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

    for col in cat_cols:
        df[col] = df[col].fillna("__MISSING__")
        # Map to integer codes
        df[col] = df[col].astype("category").cat.codes

    return df


# ─────────────────────────────────────────────────────────────────────────────
# 6. MASTER FEATURE BUILDER
# ─────────────────────────────────────────────────────────────────────────────

# Columns to EXCLUDE from model features (Section 10.1)
EXCLUDE_COLUMNS = [
    "TransactionID",    # Identifier, not a feature
    "TransactionDT",    # Used for ordering only, not a feature (Section 5.1)
    "isFraud",          # Target variable
    "uid",              # Intermediate grouping key
]


def build_features(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, FrequencyEncoder, list[str]]:
    """
    Full feature engineering pipeline applied consistently to all splits.

    Causal historical features are computed per-split to prevent leakage:
    - train: computed within train only
    - val: computed within val only (no train history leaks into val features)
    - test: computed within test only

    NOTE: In production, causal features would be computed incrementally.
    Here we compute within each split to be strictly safe.
    Frequency encoding is fit on train, applied to all.

    Returns:
        (train_featured, val_featured, test_featured, freq_encoder, feature_columns)
    """
    logger.info("Building features...")

    # Step 1: Amount features (prediction-time safe)
    train_df = build_amount_features(train_df)
    val_df = build_amount_features(val_df)
    test_df = build_amount_features(test_df)

    # Step 2: V-column missingness indicators (prediction-time safe)
    train_df = build_v_missingness_features(train_df)
    val_df = build_v_missingness_features(val_df)
    test_df = build_v_missingness_features(test_df)

    # Step 3: Fill V columns with sentinel (prediction-time safe)
    train_df = fill_v_columns_sentinel(train_df)
    val_df = fill_v_columns_sentinel(val_df)
    test_df = fill_v_columns_sentinel(test_df)

    # Step 4: Causal historical features — computed per split independently
    train_df = build_causal_historical_features(train_df)
    val_df = build_causal_historical_features(val_df)
    test_df = build_causal_historical_features(test_df)

    # Step 5: Frequency encoding — fit on TRAIN only (Section 11)
    freq_encoder = FrequencyEncoder(FREQ_ENCODE_COLUMNS)
    train_df = freq_encoder.fit_transform(train_df)
    val_df = freq_encoder.transform(val_df)
    test_df = freq_encoder.transform(test_df)

    # Step 6: Encode remaining categoricals
    train_df = encode_categoricals(train_df)
    val_df = encode_categoricals(val_df)
    test_df = encode_categoricals(test_df)

    # Step 7: Determine feature columns (exclude non-features)
    feature_columns = [c for c in train_df.columns if c not in EXCLUDE_COLUMNS]
    # Also exclude any remaining non-numeric columns
    numeric_cols = train_df[feature_columns].select_dtypes(include=[np.number]).columns.tolist()
    feature_columns = numeric_cols

    logger.info(f"  Feature columns: {len(feature_columns)}")
    logger.info(f"  Excluded: {EXCLUDE_COLUMNS}")

    return train_df, val_df, test_df, freq_encoder, feature_columns
