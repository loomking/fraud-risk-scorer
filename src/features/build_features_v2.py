"""
v2.0.0 Feature Engineering — Live-Form Features Only.

Engineers features ONLY from fields a live form can realistically collect:
TransactionDT, TransactionAmt, ProductCD, card1, card4, card6, P_emaildomain.

Zero V-columns, zero IEEE-CIS-only fields.

Feature groups:
1. Time-based: cyclical hour/day, time-since-last for card1, card1 velocity windows
2. Amount-based: log1p, deviation from card1 mean/std, round-number flag
3. Card-based: card1 frequency, card4×card6 combo, card1×ProductCD combo frequency
4. Email-based: free-mail flag, email domain frequency
5. Cross-features: card1×email co-occurrence, amount relative to ProductCD range
"""

import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
FREE_MAIL_PROVIDERS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
    "mail.com", "ymail.com", "live.com", "msn.com", "protonmail.com",
    "icloud.com", "comcast.net", "att.net", "verizon.net", "sbcglobal.net",
    "cox.net", "charter.net", "earthlink.net", "juno.com", "bellsouth.net",
    "yahoo.com.mx", "gmail", "yahoo.fr", "yahoo.es", "yahoo.de",
    "yahoo.co.uk", "yahoo.co.jp", "netzero.net", "aim.com", "rocketmail.com",
    "optonline.net", "frontier.com", "frontiernet.net", "windstream.net",
    "netzero.com", "centurylink.net",
}

# Assumed seconds per unit for time buckets
SECONDS_PER_HOUR = 3600
SECONDS_PER_DAY = 86400
SECONDS_PER_WEEK = 604800

RAW_COLS = ["TransactionID", "isFraud", "TransactionDT", "TransactionAmt",
            "ProductCD", "card1", "card4", "card6", "P_emaildomain"]


def _compute_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Group 1: Time-based features from TransactionDT."""
    dt = df["TransactionDT"].values.astype(np.float64)

    # Cyclical hour-of-day (TransactionDT is seconds elapsed, modulo 24h for hour)
    hour_of_day = (dt % SECONDS_PER_DAY) / SECONDS_PER_HOUR  # 0-24 continuous
    df["hour_sin"] = np.sin(2 * np.pi * hour_of_day / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour_of_day / 24)

    # Cyclical day-of-week (modulo 7 days)
    day_of_week = (dt % (7 * SECONDS_PER_DAY)) / SECONDS_PER_DAY  # 0-7 continuous
    df["dow_sin"] = np.sin(2 * np.pi * day_of_week / 7)
    df["dow_cos"] = np.cos(2 * np.pi * day_of_week / 7)

    return df


def _compute_card1_velocity(df: pd.DataFrame, window_label: str) -> pd.DataFrame:
    """
    Compute per-card1 velocity features using expanding windows.
    Must be called on temporally sorted data.
    Uses shift(1) to prevent leakage from the current row.
    """
    df = df.sort_values("TransactionDT").copy()

    # Time since last transaction for same card1
    df["_prev_dt"] = df.groupby("card1")["TransactionDT"].shift(1)
    df["time_since_last_card1"] = df["TransactionDT"] - df["_prev_dt"]
    df["time_since_last_card1"] = df["time_since_last_card1"].fillna(-1)  # first txn for card1
    df.drop(columns=["_prev_dt"], inplace=True)

    # Transaction count for card1 in trailing windows
    # We use cumcount with shift(1) to count prior transactions only
    df["card1_cum_count"] = df.groupby("card1").cumcount()  # 0-indexed, so this is count of PRIOR txns

    # For windowed counts, we need to iterate per group (expensive but correct)
    # Approximate with rolling on sorted data
    # Group by card1, compute rolling counts within time windows
    card1_groups = df.groupby("card1")

    # 1-hour window count
    counts_1h = []
    counts_24h = []
    counts_7d = []
    for _, group in card1_groups:
        dt_vals = group["TransactionDT"].values
        c1h = np.zeros(len(dt_vals), dtype=np.int32)
        c24h = np.zeros(len(dt_vals), dtype=np.int32)
        c7d = np.zeros(len(dt_vals), dtype=np.int32)
        for i in range(len(dt_vals)):
            current_dt = dt_vals[i]
            prior_dts = dt_vals[:i]  # strictly before current
            if len(prior_dts) > 0:
                c1h[i] = np.sum(prior_dts >= (current_dt - SECONDS_PER_HOUR))
                c24h[i] = np.sum(prior_dts >= (current_dt - SECONDS_PER_DAY))
                c7d[i] = np.sum(prior_dts >= (current_dt - SECONDS_PER_WEEK))
        counts_1h.append(pd.Series(c1h, index=group.index))
        counts_24h.append(pd.Series(c24h, index=group.index))
        counts_7d.append(pd.Series(c7d, index=group.index))

    df["card1_txn_count_1h"] = pd.concat(counts_1h)
    df["card1_txn_count_24h"] = pd.concat(counts_24h)
    df["card1_txn_count_7d"] = pd.concat(counts_7d)

    return df


def _compute_card1_velocity_fast(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fast vectorized approximation of card1 velocity features.
    Uses merge_asof-style logic for windowed counts.
    """
    df = df.sort_values("TransactionDT").copy()

    # Time since last transaction for same card1
    df["_prev_dt"] = df.groupby("card1")["TransactionDT"].shift(1)
    df["time_since_last_card1"] = df["TransactionDT"] - df["_prev_dt"]
    df["time_since_last_card1"] = df["time_since_last_card1"].fillna(-1)
    df.drop(columns=["_prev_dt"], inplace=True)

    # Cumulative count of prior txns for this card1
    df["card1_cum_count"] = df.groupby("card1").cumcount()

    # For windowed counts, use a vectorized approach:
    # Sort by TransactionDT, group by card1, and use searchsorted
    df["card1_txn_count_1h"] = 0
    df["card1_txn_count_24h"] = 0
    df["card1_txn_count_7d"] = 0

    for card1_val, group in df.groupby("card1"):
        dt_arr = group["TransactionDT"].values
        idx = group.index
        n = len(dt_arr)
        c1h = np.zeros(n, dtype=np.int32)
        c24h = np.zeros(n, dtype=np.int32)
        c7d = np.zeros(n, dtype=np.int32)
        for i in range(1, n):
            # Count how many prior transactions fall within each window
            cutoff_1h = dt_arr[i] - SECONDS_PER_HOUR
            cutoff_24h = dt_arr[i] - SECONDS_PER_DAY
            cutoff_7d = dt_arr[i] - SECONDS_PER_WEEK
            prior = dt_arr[:i]
            c1h[i] = int(np.searchsorted(prior, cutoff_1h, side="left"))
            c1h[i] = i - c1h[i]  # count of elements >= cutoff
            c24h[i] = i - int(np.searchsorted(prior, cutoff_24h, side="left"))
            c7d[i] = i - int(np.searchsorted(prior, cutoff_7d, side="left"))

        df.loc[idx, "card1_txn_count_1h"] = c1h
        df.loc[idx, "card1_txn_count_24h"] = c24h
        df.loc[idx, "card1_txn_count_7d"] = c7d

    return df


def _compute_amount_features(df: pd.DataFrame) -> pd.DataFrame:
    """Group 2: Amount-based features."""
    df["amt_log"] = np.log1p(df["TransactionAmt"])
    df["amt_decimal"] = df["TransactionAmt"] - df["TransactionAmt"].astype(int)
    df["amt_is_round"] = (df["amt_decimal"].abs() < 0.01).astype(np.float32)
    return df


def _compute_card1_amount_stats(train_df: pd.DataFrame, target_df: pd.DataFrame) -> pd.DataFrame:
    """
    Amount deviation from card1's historical mean/std.
    Stats computed from training data only.
    """
    card1_stats = train_df.groupby("card1")["TransactionAmt"].agg(["mean", "std"]).reset_index()
    card1_stats.columns = ["card1", "card1_amt_mean", "card1_amt_std"]
    card1_stats["card1_amt_std"] = card1_stats["card1_amt_std"].fillna(1.0).replace(0.0, 1.0)

    target_df = target_df.merge(card1_stats, on="card1", how="left")
    target_df["card1_amt_mean"] = target_df["card1_amt_mean"].fillna(train_df["TransactionAmt"].mean())
    target_df["card1_amt_std"] = target_df["card1_amt_std"].fillna(train_df["TransactionAmt"].std())
    target_df["amt_deviation_from_card1"] = (
        (target_df["TransactionAmt"] - target_df["card1_amt_mean"]) / target_df["card1_amt_std"]
    )
    target_df.drop(columns=["card1_amt_mean", "card1_amt_std"], inplace=True)

    return target_df


def _compute_frequency_features(train_df: pd.DataFrame, target_df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Groups 3-5: Frequency encodings and cross-features.
    All frequencies fit on training data only.
    Returns (target_df_with_features, freq_maps_dict).
    """
    freq_maps = {}

    # card1 frequency
    card1_freq = train_df["card1"].value_counts(normalize=True).to_dict()
    freq_maps["card1_freq"] = card1_freq
    target_df["card1_freq"] = target_df["card1"].map(card1_freq).fillna(0.0)

    # card4 × card6 combination frequency
    train_combo = train_df["card4"].astype(str) + "_" + train_df["card6"].astype(str)
    combo_freq = train_combo.value_counts(normalize=True).to_dict()
    freq_maps["card4_card6_combo_freq"] = combo_freq
    target_combo = target_df["card4"].astype(str) + "_" + target_df["card6"].astype(str)
    target_df["card4_card6_combo_freq"] = target_combo.map(combo_freq).fillna(0.0)

    # card1 × ProductCD combination frequency
    train_cp = train_df["card1"].astype(str) + "_" + train_df["ProductCD"].astype(str)
    cp_freq = train_cp.value_counts(normalize=True).to_dict()
    freq_maps["card1_productcd_freq"] = cp_freq
    target_cp = target_df["card1"].astype(str) + "_" + target_df["ProductCD"].astype(str)
    target_df["card1_productcd_freq"] = target_cp.map(cp_freq).fillna(0.0)

    # Email domain frequency
    email_freq = train_df["P_emaildomain"].fillna("__MISSING__").value_counts(normalize=True).to_dict()
    freq_maps["email_freq"] = email_freq
    target_df["email_freq"] = target_df["P_emaildomain"].fillna("__MISSING__").map(email_freq).fillna(0.0)

    # Free mail provider flag
    target_df["is_free_email"] = target_df["P_emaildomain"].fillna("").str.lower().isin(FREE_MAIL_PROVIDERS).astype(np.float32)

    # card1 × P_emaildomain co-occurrence frequency (cross-feature)
    train_ce = train_df["card1"].astype(str) + "_" + train_df["P_emaildomain"].fillna("__MISSING__").astype(str)
    ce_freq = train_ce.value_counts(normalize=True).to_dict()
    freq_maps["card1_email_cooccurrence_freq"] = ce_freq
    target_ce = target_df["card1"].astype(str) + "_" + target_df["P_emaildomain"].fillna("__MISSING__").astype(str)
    target_df["card1_email_cooccurrence"] = target_ce.map(ce_freq).fillna(0.0)

    # TransactionAmt relative to ProductCD typical range
    pcd_stats = train_df.groupby("ProductCD")["TransactionAmt"].agg(["mean", "std"]).reset_index()
    pcd_stats.columns = ["ProductCD", "pcd_amt_mean", "pcd_amt_std"]
    pcd_stats["pcd_amt_std"] = pcd_stats["pcd_amt_std"].fillna(1.0).replace(0.0, 1.0)
    freq_maps["pcd_amt_stats"] = pcd_stats.set_index("ProductCD").to_dict("index")

    target_df = target_df.merge(pcd_stats, on="ProductCD", how="left")
    global_mean = train_df["TransactionAmt"].mean()
    global_std = train_df["TransactionAmt"].std()
    target_df["pcd_amt_mean"] = target_df["pcd_amt_mean"].fillna(global_mean)
    target_df["pcd_amt_std"] = target_df["pcd_amt_std"].fillna(global_std)
    target_df["amt_vs_productcd"] = (
        (target_df["TransactionAmt"] - target_df["pcd_amt_mean"]) / target_df["pcd_amt_std"]
    )
    target_df.drop(columns=["pcd_amt_mean", "pcd_amt_std"], inplace=True)

    # Categorical encodings for card4, card6, ProductCD (ordinal, train-fit)
    for cat_col in ["card4", "card6", "ProductCD"]:
        train_vals = train_df[cat_col].fillna("__MISSING__").astype(str)
        unique_vals = sorted(train_vals.unique())
        cat_map = {v: i for i, v in enumerate(unique_vals)}
        cat_map["__UNKNOWN__"] = -1
        freq_maps[f"{cat_col}_cat_map"] = cat_map
        target_df[f"{cat_col}_encoded"] = (
            target_df[cat_col].fillna("__MISSING__").astype(str).map(cat_map).fillna(-1).astype(int)
        )

    return target_df, freq_maps


# ── Final feature list ────────────────────────────────────────────────────────
FEATURE_COLUMNS_V2 = [
    # Time
    "hour_sin", "hour_cos", "dow_sin", "dow_cos",
    "time_since_last_card1",
    "card1_cum_count",
    "card1_txn_count_1h", "card1_txn_count_24h", "card1_txn_count_7d",
    # Amount
    "amt_log", "amt_decimal", "amt_is_round",
    "amt_deviation_from_card1",
    # Card
    "card1_freq",
    "card4_card6_combo_freq",
    "card1_productcd_freq",
    "card4_encoded", "card6_encoded", "ProductCD_encoded",
    # Email
    "email_freq", "is_free_email",
    # Cross
    "card1_email_cooccurrence",
    "amt_vs_productcd",
]


def build_features_v2(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict, list[str]]:
    """
    Build v2 features from live-form-compatible fields only.

    Returns:
        (train_feat, val_feat, test_feat, freq_maps, feature_columns)
    """
    logger.info(f"  Building v2 features from {len(RAW_COLS)} raw columns")
    logger.info(f"  Ensuring ZERO V-columns or IEEE-CIS-only fields")

    # Subset to only the columns we need
    for split_name, df in [("train", train_df), ("val", val_df), ("test", test_df)]:
        missing = set(RAW_COLS) - set(df.columns)
        if missing:
            raise ValueError(f"{split_name} missing required columns: {missing}")

    # Work with copies, keeping only raw cols + target
    train = train_df[RAW_COLS].copy()
    val = val_df[RAW_COLS].copy()
    test = test_df[RAW_COLS].copy()

    # ── Group 1: Time features ────────────────────────────────────────────
    logger.info("  [1/5] Time-based features...")
    train = _compute_time_features(train)
    val = _compute_time_features(val)
    test = _compute_time_features(test)

    # Velocity features (must be computed on combined sorted data per split)
    logger.info("  [1/5] Card1 velocity (this takes a minute)...")
    train = _compute_card1_velocity_fast(train)
    val = _compute_card1_velocity_fast(val)
    test = _compute_card1_velocity_fast(test)

    # ── Group 2: Amount features ──────────────────────────────────────────
    logger.info("  [2/5] Amount-based features...")
    train = _compute_amount_features(train)
    val = _compute_amount_features(val)
    test = _compute_amount_features(test)

    # Amount deviation from card1 historical (train-fit)
    train = _compute_card1_amount_stats(train, train)
    val = _compute_card1_amount_stats(train_df[RAW_COLS], val)  # use original train for stats
    test = _compute_card1_amount_stats(train_df[RAW_COLS], test)

    # ── Groups 3-5: Frequency, cross-features ─────────────────────────────
    logger.info("  [3-5/5] Frequency encodings and cross-features...")
    train, freq_maps = _compute_frequency_features(train, train)
    val, _ = _compute_frequency_features(train_df[RAW_COLS], val)
    test, _ = _compute_frequency_features(train_df[RAW_COLS], test)

    # ── Validate: no V-columns, no IEEE-CIS-only fields ───────────────────
    for col in FEATURE_COLUMNS_V2:
        if col.startswith("V") and col[1:].isdigit():
            raise AssertionError(f"V-column leaked into feature set: {col}")

    logger.info(f"  Final feature count: {len(FEATURE_COLUMNS_V2)}")
    logger.info(f"  Features: {FEATURE_COLUMNS_V2}")

    # Ensure all feature columns exist
    for split_name, df in [("train", train), ("val", val), ("test", test)]:
        missing = set(FEATURE_COLUMNS_V2) - set(df.columns)
        if missing:
            raise ValueError(f"{split_name} missing engineered features: {missing}")

    return train, val, test, freq_maps, FEATURE_COLUMNS_V2
