import numpy as np
import pandas as pd
import pytest

from src.features.build_features_v2 import (
    _compute_card1_velocity_fast,
    _compute_card1_amount_stats,
    SECONDS_PER_HOUR,
    SECONDS_PER_DAY,
    SECONDS_PER_WEEK
)


@pytest.fixture
def velocity_test_df():
    """
    Transactions for a single card1 (100) to test rolling time windows.
    Times in seconds.
    """
    df = pd.DataFrame({
        "TransactionID": [1, 2, 3, 4, 5, 6],
        "TransactionDT": [
            100,                                # t=100
            100 + SECONDS_PER_HOUR - 10,        # < 1 hour later
            100 + SECONDS_PER_HOUR + 10,        # > 1 hour later, < 24h
            100 + SECONDS_PER_DAY - 10,         # < 24h later
            100 + SECONDS_PER_DAY + 10,         # > 24h later, < 7d
            100 + SECONDS_PER_WEEK + 10,        # > 7d later
        ],
        "card1": [100, 100, 100, 100, 100, 100],
    })
    return df


class TestV201VelocityFeatures:
    """Test v2.0.1 causal historical features (_compute_card1_velocity_fast)."""

    def test_first_transaction_has_no_history(self, velocity_test_df):
        """First transaction must have -1 for time_since_last and 0 for counts."""
        result = _compute_card1_velocity_fast(velocity_test_df)
        first_row = result.iloc[0]

        assert first_row["time_since_last_card1"] == -1.0
        assert first_row["card1_cum_count"] == 0
        assert first_row["card1_txn_count_1h"] == 0
        assert first_row["card1_txn_count_24h"] == 0
        assert first_row["card1_txn_count_7d"] == 0

    def test_no_future_leakage(self, velocity_test_df):
        """
        Verify that counts at any step strictly look backward, never forward.
        """
        result = _compute_card1_velocity_fast(velocity_test_df)
        
        # Row 2 is within 1 hour of Row 1.
        row2 = result.iloc[1]
        assert row2["card1_txn_count_1h"] == 1
        assert row2["card1_txn_count_24h"] == 1
        
        # Row 3 is > 1 hour after Row 1, but < 1 hour after Row 2.
        row3 = result.iloc[2]
        # It should see Row 2 in 1h window, and Rows 1 & 2 in 24h window
        assert row3["card1_txn_count_1h"] == 1
        assert row3["card1_txn_count_24h"] == 2

        # Last row is at t = 100 + 7d + 10
        # Cutoff for 7d is t - 7d = 110
        # Row 1 is at t=100 (< 110), so it falls outside the 7d window.
        # Rows 2, 3, 4, 5 are all >= 110, so they fall inside.
        row6 = result.iloc[5]
        assert row6["card1_txn_count_7d"] == 4
        # For the 24h window, cutoff is 604910 - 86400 = 518510.
        # All prior transactions are < 518510.
        assert row6["card1_txn_count_24h"] == 0

    def test_time_since_last(self, velocity_test_df):
        """Test exact calculation of time delta."""
        result = _compute_card1_velocity_fast(velocity_test_df)
        # Row 2 is (SECONDS_PER_HOUR - 10) after Row 1
        assert result.iloc[1]["time_since_last_card1"] == (SECONDS_PER_HOUR - 10)


class TestV201AmountStats:
    """Test amt_deviation_from_card1 calculation."""

    def test_amount_deviation_train_test_split(self):
        """Stats must be computed on training set and applied to target without leakage."""
        train_df = pd.DataFrame({
            "card1": [100, 100, 100],
            "TransactionAmt": [10.0, 20.0, 30.0]  # mean=20, std=10
        })
        
        # Test set has different amounts, but should be scaled by train stats
        test_df = pd.DataFrame({
            "card1": [100, 200],  # 200 is unseen
            "TransactionAmt": [40.0, 50.0] 
        })
        
        result = _compute_card1_amount_stats(train_df, test_df)
        
        # For card1=100: (40 - 20) / 10 = +2.0
        assert result.iloc[0]["amt_deviation_from_card1"] == pytest.approx(2.0)
        
        # For card1=200 (unseen): uses global train mean=20, global train std=10
        # (50 - 20) / 10 = +3.0
        assert result.iloc[1]["amt_deviation_from_card1"] == pytest.approx(3.0)
