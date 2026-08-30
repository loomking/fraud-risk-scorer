"""
Synthetic UID construction (Section 10.2).

Combines card1 + addr1 + D1 to create a candidate client identifier.

The raw component values (card1, addr1, D1) are submitted with the transaction
itself, so they are trivially available at prediction time — that is not where
the leakage risk lives. The actual leakage risk is entirely in the aggregate
features built from this synthetic uid (see build_features.py): those aggregates
must never use information from a client's future transactions.
"""

import pandas as pd


def construct_uid(df: pd.DataFrame) -> pd.Series:
    """
    Create a synthetic client identifier from card1 + addr1 + D1.

    All three component fields are present at transaction submission time.
    Missing values are filled with a sentinel to avoid NaN-based grouping issues.

    Returns a string Series suitable for groupby operations.
    """
    card1 = df["card1"].fillna(-999).astype(int).astype(str)
    addr1 = df["addr1"].fillna(-999).astype(int).astype(str)

    # D1 is the number of days between card issuance and transaction.
    # It's available at prediction time (submitted with the transaction).
    # Using int to avoid floating-point grouping issues.
    d1 = df["D1"].fillna(-999).astype(int).astype(str)

    uid = card1 + "_" + addr1 + "_" + d1
    return uid
