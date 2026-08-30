"""
Tests for feature engineering (Section 32: test_features.py).

Verifies: no future information, causal historical features, deterministic transformations.
Includes manual trace for at least 3 test transactions (Section 10.3).
"""

import numpy as np
import pandas as pd
import pytest

from src.features.build_features import (
    build_causal_historical_features,
    build_amount_features,
    FrequencyEncoder,
)
from src.features.uid import construct_uid


@pytest.fixture
def causal_test_df():
    """
    Create a DataFrame with known values for manual causal feature verification.
    Three transactions from uid "100_200_30", one from uid "999_888_10".
    """
    df = pd.DataFrame({
        "TransactionID": [1, 2, 3, 4, 5],
        "TransactionDT": [100, 200, 300, 400, 500],
        "TransactionAmt": [10.0, 20.0, 30.0, 50.0, 40.0],
        "isFraud": [0, 1, 0, 0, 1],
        "card1": [100, 100, 100, 999, 100],
        "addr1": [200, 200, 200, 888, 200],
        "D1": [30, 30, 30, 10, 30],
        "ProductCD": ["W", "W", "H", "C", "W"],
    })
    return df


class TestCausalHistoricalFeatures:
    """Test that historical aggregates only use strictly earlier transactions."""

    def test_first_transaction_has_no_history(self, causal_test_df):
        """The first transaction for a uid should have no prior history."""
        result = build_causal_historical_features(causal_test_df)
        uid_mask = result["uid"] == "100_200_30"
        first_row = result[uid_mask].iloc[0]

        # First transaction: count=0 (no prior), avg/max/fraud_rate = -1 (sentinel)
        assert first_row["uid_txn_count_hist"] == 0
        assert first_row["uid_avg_amt_hist"] == -1  # No prior history
        assert first_row["uid_max_amt_hist"] == -1

    def test_second_transaction_uses_only_first(self, causal_test_df):
        """
        Second transaction should see ONLY the first transaction's data.
        Manual trace: uid "100_200_30", txn 2 (amt=20, DT=200)
          Prior txns: [txn 1 (amt=10, fraud=0)]
          Expected: count=1, avg_amt=10.0, max_amt=10.0, prior_fraud_rate=0.0
        """
        result = build_causal_historical_features(causal_test_df)
        uid_mask = result["uid"] == "100_200_30"
        second_row = result[uid_mask].iloc[1]

        assert second_row["uid_txn_count_hist"] == 1
        assert second_row["uid_avg_amt_hist"] == pytest.approx(10.0)
        assert second_row["uid_max_amt_hist"] == pytest.approx(10.0)
        assert second_row["uid_prior_fraud_rate"] == pytest.approx(0.0)

    def test_third_transaction_uses_first_two(self, causal_test_df):
        """
        Third transaction should see first two transactions.
        Manual trace: uid "100_200_30", txn 3 (amt=30, DT=300)
          Prior txns: [txn 1 (amt=10, fraud=0), txn 2 (amt=20, fraud=1)]
          Expected: count=2, avg_amt=15.0, max_amt=20.0, prior_fraud_rate=0.5
        """
        result = build_causal_historical_features(causal_test_df)
        uid_mask = result["uid"] == "100_200_30"
        third_row = result[uid_mask].iloc[2]

        assert third_row["uid_txn_count_hist"] == 2
        assert third_row["uid_avg_amt_hist"] == pytest.approx(15.0)
        assert third_row["uid_max_amt_hist"] == pytest.approx(20.0)
        assert third_row["uid_prior_fraud_rate"] == pytest.approx(0.5)

    def test_fourth_transaction_different_uid(self, causal_test_df):
        """
        Transaction with uid "999_888_10" has no prior history.
        Manual trace: uid "999_888_10", txn 4 (amt=50, DT=400)
          Prior txns: [] (first transaction for this uid)
          Expected: count=0, avg/max = -1 (sentinel)
        """
        result = build_causal_historical_features(causal_test_df)
        uid_mask = result["uid"] == "999_888_10"
        row = result[uid_mask].iloc[0]

        assert row["uid_txn_count_hist"] == 0
        assert row["uid_avg_amt_hist"] == -1
        assert row["uid_max_amt_hist"] == -1

    def test_no_future_leakage_in_count(self, causal_test_df):
        """
        The first transaction's count must be 0 even though later transactions exist.
        This specifically tests that future data does NOT leak backward.
        """
        result = build_causal_historical_features(causal_test_df)
        uid_mask = result["uid"] == "100_200_30"
        first = result[uid_mask].iloc[0]
        # There are 4 total txns for this uid, but first should see 0
        assert first["uid_txn_count_hist"] == 0

    def test_unsorted_df_raises(self):
        """Must reject unsorted input."""
        df = pd.DataFrame({
            "TransactionID": [1, 2],
            "TransactionDT": [200, 100],  # Not sorted!
            "TransactionAmt": [10.0, 20.0],
            "isFraud": [0, 1],
            "card1": [100, 100],
            "addr1": [200, 200],
            "D1": [30, 30],
        })
        with pytest.raises(AssertionError, match="sorted"):
            build_causal_historical_features(df)


class TestAmountFeatures:
    """Test transaction amount feature derivation."""

    def test_log_transform(self):
        df = pd.DataFrame({"TransactionAmt": [1.0, 10.0, 100.0, 0.0]})
        result = build_amount_features(df)
        expected = np.log1p(df["TransactionAmt"])
        np.testing.assert_array_almost_equal(result["amt_log"].values, expected.values)

    def test_decimal_extraction(self):
        df = pd.DataFrame({"TransactionAmt": [10.50, 100.00, 25.99]})
        result = build_amount_features(df)
        assert result["amt_decimal"].iloc[0] == pytest.approx(0.50)
        assert result["amt_decimal"].iloc[1] == pytest.approx(0.00)
        assert result["amt_decimal"].iloc[2] == pytest.approx(0.99)


class TestFrequencyEncoder:
    """Test that frequency encoding is train-only and handles unknowns."""

    def test_fit_on_train_only(self):
        """Encoding must reflect training frequencies, not test."""
        train = pd.DataFrame({"col": ["A", "A", "A", "B"]})
        test = pd.DataFrame({"col": ["A", "B", "C"]})  # C is unknown

        enc = FrequencyEncoder(["col"])
        enc.fit(train)

        train_encoded = enc.transform(train)
        test_encoded = enc.transform(test)

        # A frequency in train = 3/4 = 0.75
        assert train_encoded["col_freq"].iloc[0] == pytest.approx(0.75)
        # B frequency in train = 1/4 = 0.25
        assert test_encoded["col_freq"].iloc[1] == pytest.approx(0.25)
        # C (unknown) → 0.0
        assert test_encoded["col_freq"].iloc[2] == pytest.approx(0.0)

    def test_unfitted_raises(self):
        """Must raise if transform called before fit."""
        enc = FrequencyEncoder(["col"])
        with pytest.raises(AssertionError, match="fit"):
            enc.transform(pd.DataFrame({"col": ["A"]}))


class TestUID:
    """Test UID construction."""

    def test_uid_format(self):
        df = pd.DataFrame({
            "card1": [100, 200],
            "addr1": [300, 400],
            "D1": [10, 20],
        })
        uid = construct_uid(df)
        assert uid.iloc[0] == "100_300_10"
        assert uid.iloc[1] == "200_400_20"

    def test_uid_with_nan(self):
        df = pd.DataFrame({
            "card1": [100, np.nan],
            "addr1": [np.nan, 400],
            "D1": [10, np.nan],
        })
        uid = construct_uid(df)
        assert uid.iloc[0] == "100_-999_10"
        assert uid.iloc[1] == "-999_400_-999"
