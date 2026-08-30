#!/usr/bin/env bash
# ── Dataset Download Script ──────────────────────────────────────────────────
# Downloads the IEEE-CIS Fraud Detection dataset from Kaggle.
#
# Prerequisites:
#   1. Kaggle CLI installed: pip install kaggle
#   2. Kaggle API credentials configured: ~/.kaggle/kaggle.json
#      (Get from: https://www.kaggle.com/settings → API → Create New Token)
#   3. Accept competition rules at:
#      https://www.kaggle.com/c/ieee-fraud-detection/rules
#
# Usage:
#   cd <project-root>
#   bash data/download_data.sh
#
# Output:
#   data/raw/train_transaction.csv
#   data/raw/train_identity.csv
#   (plus test files — we only use train_* for this project)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAW_DIR="${SCRIPT_DIR}/raw"

mkdir -p "${RAW_DIR}"

echo "=== Downloading IEEE-CIS Fraud Detection dataset ==="
kaggle competitions download -c ieee-fraud-detection -p "${RAW_DIR}/"

echo "=== Extracting ==="
cd "${RAW_DIR}"
unzip -o ieee-fraud-detection.zip

echo "=== Verifying required files ==="
for f in train_transaction.csv train_identity.csv; do
    if [ ! -f "${f}" ]; then
        echo "ERROR: Missing required file: ${f}" >&2
        exit 1
    fi
    echo "  ✓ ${f} ($(du -h "${f}" | cut -f1))"
done

echo "=== Dataset ready ==="
