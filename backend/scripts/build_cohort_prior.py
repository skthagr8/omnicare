# scripts/build_cohort_prior.py
#
# Run this ONCE, offline, with access to the training CSV and the trained
# checkpoint. Produces `cohort_prior.npy`, the (13, F) median-trajectory file
# consumed by `ModelRegistry.load()`.
#
# Usage:
#   python scripts/build_cohort_prior.py
#   (works from any working directory; all paths are anchored to this file)

import numpy as np
import pandas as pd
import torch
from pathlib import Path

# ---------------------------------------------------------------- paths
SCRIPT_DIR   = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent                    # scripts/ → repo root

CKPT_PATH    = PROJECT_ROOT / "app/modules/ai/checkpoints/cognitive_lstm.pt"
CHECKSUM_PATH = PROJECT_ROOT / "app/modules/ai/checkpoints/cognitive_lstm.md5"
OUTPUT_PATH  = PROJECT_ROOT / "app/modules/ai/checkpoints/cohort_prior.npy"
TRAINING_CSV = PROJECT_ROOT / "app/modules/ai/checkpoints/OmniCare_NHATS_Encoded_Structural_Missingness_R2.csv"


# ---------------------------------------------------------------- checkpoint
ckpt = torch.load(CKPT_PATH, map_location="cpu", weights_only=False)
feature_columns = list(ckpt["feature_columns"])
print(f"Loaded checkpoint: {len(feature_columns)} features")

# ---------------------------------------------------------------- training data
if not TRAINING_CSV.exists():
    raise FileNotFoundError(f"Training CSV not found: {TRAINING_CSV}")
if not CKPT_PATH.exists():
    raise FileNotFoundError(f"Checkpoint not found: {CKPT_PATH}")

df = pd.read_csv(TRAINING_CSV)
print(f"Loaded CSV: {df.shape}")

# ---------------------------------------------------------------- clean missing codes
MISSING_CODES = [-1, -2, -3, -7, -8, -9]

base_columns = [
    c for c in feature_columns
    if not c.endswith("__structural") and not c.endswith("__true_missing")
]

for col in base_columns:
    if col not in df.columns:
        raise KeyError(f"Feature column missing from CSV: {col!r}")
    df[col] = pd.to_numeric(df[col], errors="coerce").replace(MISSING_CODES, np.nan)

# sanity: print min/max so you can eyeball for leftover sentinel values
print("\nFeature ranges after cleaning:")
print(df[base_columns].describe().T[["min", "max"]].head(10))

# ---------------------------------------------------------------- median trajectory
prior = (
    df.groupby("nhats_round")[feature_columns]
      .median()
      .reindex(range(1, 14))
      .ffill()
      .bfill()
)

assert prior.shape == (13, len(feature_columns)), prior.shape
assert not prior.isna().any().any(), (
    "Prior contains NaN after reindex/ffill/bfill — investigate the CSV for "
    "rounds with no data or features that are entirely missing."
)

np.save(OUTPUT_PATH, prior.values.astype(np.float32))
print(f"\nSaved cohort prior: {prior.shape} → {OUTPUT_PATH}")