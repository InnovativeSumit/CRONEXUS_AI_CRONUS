"""
CropNexus - synthetic training data for the 8 crops that are NOT in the public
Kaggle "Crop Recommendation" dataset (22 crops).

IMPORTANT - READ BEFORE TRUSTING THE NUMBERS
  * The 22 original crops use the public Kaggle dataset (data/raw/Crop_recommendation.csv).
  * The 8 added crops (wheat, sorghum, millet, soybean, groundnut, sugarcane,
    potato, tomato) have NO measured data in this project. Their rows are
    SYNTHETIC: sampled from truncated normal distributions whose ranges are
    approximate agronomic rules of thumb written by the project author.
  * They are meant to demonstrate a 30-crop pipeline. They are NOT field
    measurements and must be reviewed by an agronomist (or replaced with real
    data) before real farming decisions rely on them.
  * Every row carries source="synthetic" (real rows carry source="real") so
    the two are never confused; the training script reports metrics for each.

Reproducible: fixed seed -> identical CSV every run.
    python generate_synthetic_data.py
"""
import os
import numpy as np
import pandas as pd

SEED = 42
ROWS_PER_CROP = 100  # same as each real class in the Kaggle data
BASE = os.path.dirname(os.path.abspath(__file__))

# (low, high) per variable. N/P/K in the same units as the Kaggle data; temp °C; humidity %; rainfall mm.
RANGES = {
    "wheat":     dict(N=(80, 120),  P=(40, 60),  K=(30, 50),   temperature=(12, 22), humidity=(50, 70), ph=(6.0, 7.5), rainfall=(50, 100)),
    "sorghum":   dict(N=(60, 100),  P=(30, 50),  K=(30, 50),   temperature=(25, 33), humidity=(45, 65), ph=(6.0, 7.5), rainfall=(40, 100)),
    "millet":    dict(N=(40, 80),   P=(20, 40),  K=(20, 40),   temperature=(26, 34), humidity=(35, 55), ph=(6.0, 7.5), rainfall=(30, 70)),
    "soybean":   dict(N=(20, 50),   P=(50, 80),  K=(30, 60),   temperature=(22, 30), humidity=(65, 85), ph=(6.0, 7.0), rainfall=(100, 160)),
    "groundnut": dict(N=(15, 35),   P=(30, 50),  K=(40, 80),   temperature=(24, 32), humidity=(55, 75), ph=(5.8, 6.8), rainfall=(60, 120)),
    "sugarcane": dict(N=(100, 150), P=(40, 70),  K=(60, 100),  temperature=(25, 35), humidity=(70, 85), ph=(6.5, 7.5), rainfall=(150, 250)),
    "potato":    dict(N=(100, 140), P=(55, 80),  K=(100, 150), temperature=(15, 22), humidity=(70, 85), ph=(5.0, 6.0), rainfall=(60, 110)),
    "tomato":    dict(N=(90, 130),  P=(50, 80),  K=(70, 110),  temperature=(20, 28), humidity=(60, 75), ph=(6.0, 6.8), rainfall=(50, 100)),
}


def generate(seed: int = SEED, rows: int = ROWS_PER_CROP) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    frames = []
    for crop, spec in RANGES.items():
        cols = {}
        for var, (lo, hi) in spec.items():
            mean, sd = (lo + hi) / 2, (hi - lo) / 4  # ~95 % of draws fall inside the stated range
            cols[var] = np.clip(rng.normal(mean, sd, rows), lo - (hi - lo) * 0.15, hi + (hi - lo) * 0.15)
        frame = pd.DataFrame(cols)
        frame["label"] = crop
        frames.append(frame)
    df = pd.concat(frames, ignore_index=True)
    for c in ["N", "P", "K"]:
        df[c] = df[c].clip(lower=0).round(0).astype(int)
    df["temperature"] = df["temperature"].round(2)
    df["humidity"] = df["humidity"].round(2).clip(upper=100)
    df["ph"] = df["ph"].round(2).clip(lower=3.5, upper=9.5)
    df["rainfall"] = df["rainfall"].round(2).clip(lower=0)
    df["source"] = "synthetic"
    return df[["N", "P", "K", "temperature", "humidity", "ph", "rainfall", "label", "source"]]


if __name__ == "__main__":
    out = generate()
    os.makedirs(f"{BASE}/data/synthetic", exist_ok=True)
    path = f"{BASE}/data/synthetic/synthetic_crops.csv"
    out.to_csv(path, index=False)
    print(f"Wrote {len(out)} SYNTHETIC rows for {out['label'].nunique()} crops -> {path}")
