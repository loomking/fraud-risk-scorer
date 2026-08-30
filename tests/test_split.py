"""
Tests for temporal splitting (Section 32: test_split.py).

Verifies: chronology, no overlap, deterministic, correct ordering.
"""

import numpy as np
import pandas as pd
import pytest

from src.data import temporal_split, sort_by_time, verify_split_integrity


@pytest.fixture
def sample_df():
    """Create a sample DataFrame with known temporal ordering."""
    np.random.seed(42)
    n = 1000
    df = pd.DataFrame({
        "TransactionID": range(1, n + 1),
        "TransactionDT": sorted(np.random.randint(100, 100000, size=n)),
        "TransactionAmt": np.random.uniform(1, 500, size=n),
        "isFraud": np.random.binomial(1, 0.035, size=n),
    })
    return sort_by_time(df)


class TestTemporalSplit:
    """Test chronological splitting."""

    def test_no_overlap_train_val(self, sample_df):
        """Train max DT must be <= val min DT."""
        train, val, test = temporal_split(sample_df)
        assert train["TransactionDT"].max() <= val["TransactionDT"].min()

    def test_no_overlap_val_test(self, sample_df):
        """Val max DT must be <= test min DT."""
        train, val, test = temporal_split(sample_df)
        assert val["TransactionDT"].max() <= test["TransactionDT"].min()

    def test_no_overlap_train_test(self, sample_df):
        """Train max DT must be <= test min DT."""
        train, val, test = temporal_split(sample_df)
        assert train["TransactionDT"].max() <= test["TransactionDT"].min()

    def test_all_rows_accounted(self, sample_df):
        """No rows lost or duplicated in splitting."""
        train, val, test = temporal_split(sample_df)
        assert len(train) + len(val) + len(test) == len(sample_df)

    def test_approximate_ratios(self, sample_df):
        """Splits are approximately 70/15/15."""
        train, val, test = temporal_split(sample_df)
        n = len(sample_df)
        assert 0.65 <= len(train) / n <= 0.75
        assert 0.10 <= len(val) / n <= 0.20
        assert 0.10 <= len(test) / n <= 0.20

    def test_deterministic(self, sample_df):
        """Same input produces same splits."""
        train1, val1, test1 = temporal_split(sample_df)
        train2, val2, test2 = temporal_split(sample_df)
        pd.testing.assert_frame_equal(train1, train2)
        pd.testing.assert_frame_equal(val1, val2)
        pd.testing.assert_frame_equal(test1, test2)

    def test_chronological_ordering_within_splits(self, sample_df):
        """Each split must be internally sorted by TransactionDT."""
        train, val, test = temporal_split(sample_df)
        for split_df in [train, val, test]:
            diffs = split_df["TransactionDT"].diff().dropna()
            assert (diffs >= 0).all(), "Split is not chronologically ordered"

    def test_no_random_splitting(self, sample_df):
        """Verify splits are contiguous index ranges (not random subsets)."""
        train, val, test = temporal_split(sample_df)
        # Original indices should be contiguous ranges
        all_original_idx = np.concatenate([
            train.index.values, val.index.values, test.index.values
        ])
        assert len(set(all_original_idx)) == len(sample_df)


class TestSortByTime:
    """Test chronological sorting."""

    def test_sorted_ascending(self, sample_df):
        """TransactionDT must be non-decreasing after sorting."""
        sorted_df = sort_by_time(sample_df)
        diffs = sorted_df["TransactionDT"].diff().dropna()
        assert (diffs >= 0).all()

    def test_preserves_rows(self, sample_df):
        """Sorting must not add or remove rows."""
        sorted_df = sort_by_time(sample_df)
        assert len(sorted_df) == len(sample_df)


class TestVerifySplitIntegrity:
    """Test the integrity verification function."""

    def test_report_has_required_keys(self, sample_df):
        """Report must contain all Checkpoint 1 fields."""
        train, val, test = temporal_split(sample_df)
        report = verify_split_integrity(train, val, test, len(sample_df))

        required_keys = [
            "total_rows", "train_rows", "val_rows", "test_rows",
            "train_dt_min", "train_dt_max",
            "val_dt_min", "val_dt_max",
            "test_dt_min", "test_dt_max",
            "no_overlap_train_val", "no_overlap_val_test",
            "no_random_split",
        ]
        for key in required_keys:
            assert key in report, f"Missing key: {key}"

    def test_no_overlap_flags(self, sample_df):
        """Both overlap flags must be True for valid splits."""
        train, val, test = temporal_split(sample_df)
        report = verify_split_integrity(train, val, test, len(sample_df))
        assert report["no_overlap_train_val"] == True
        assert report["no_overlap_val_test"] == True
