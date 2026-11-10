"""
CropNexus - train the soil-PHOTO classifier (TensorFlow).

What it can learn: the broad soil TYPE visible in a photo (colour / texture) - e.g. Alluvial, Black, Red.
What it cannot learn: nitrogen, phosphorus, potassium, pH, salinity or moisture. Those need a lab test or a sensor;
the app takes them as optional typed-in measurements instead (rule-based, see ml_service/soil.py).

Pipeline (reproducible, seed 42):
  1. read  data/soil_images/<ClassName>/*.jpg|png|webp
  2. drop exact duplicates (MD5) and near-duplicates (8x8 average hash) to limit train/test leakage
  3. stratified 70 / 15 / 15 split
  4. train a small CNN from scratch with augmentation + class weights (the data are imbalanced)
  5. evaluate ONLY on the untouched test split -> models/soil/metrics.json (accuracy, macro-F1, per-class, confusion matrix)
  6. save weights + class names to app/model/soil/

Usage:  python download_soil_dataset.py && python train_soil_model.py [--epochs 60] [--data data/soil_images]
The numbers in metrics.json are whatever this run measured - nothing is hard-coded.
"""
import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
import numpy as np
from PIL import Image, ImageOps
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE / "app"))
from soil_architecture import IMG_SIZE, build_soil_model  # noqa: E402

SEED = 42
EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def ahash(img: Image.Image) -> int:
    g = np.asarray(ImageOps.grayscale(img).resize((8, 8)), dtype="float32")
    bits = (g > g.mean()).flatten()
    return int("".join("1" if b else "0" for b in bits), 2)


def load_dataset(root: Path):
    classes = sorted(p.name for p in root.iterdir() if p.is_dir())
    if len(classes) < 2:
        sys.exit(f"Need at least 2 class folders in {root} (run download_soil_dataset.py first).")
    X, y, seen_md5, seen_hash = [], [], set(), []
    dropped = {"unreadable": 0, "exact_duplicates": 0, "near_duplicates": 0}
    for ci, cls in enumerate(classes):
        for f in sorted((root / cls).iterdir()):
            if f.suffix.lower() not in EXTS:
                continue
            md5 = hashlib.md5(f.read_bytes()).hexdigest()
            if md5 in seen_md5:
                dropped["exact_duplicates"] += 1
                continue
            try:
                img = Image.open(f).convert("RGB")
            except Exception:
                dropped["unreadable"] += 1
                continue
            h = ahash(img)
            if any(bin(h ^ o).count("1") <= 2 for o in seen_hash):
                dropped["near_duplicates"] += 1
                continue
            seen_md5.add(md5)
            seen_hash.append(h)
            X.append(np.asarray(img.resize(IMG_SIZE), dtype="uint8"))
            y.append(ci)
    return np.stack(X), np.array(y), classes, dropped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(BASE / "data" / "soil_images"))
    ap.add_argument("--epochs", type=int, default=60)
    ap.add_argument("--batch", type=int, default=32)
    a = ap.parse_args()

    import tensorflow as tf
    from tensorflow import keras
    tf.keras.utils.set_random_seed(SEED)

    X, y, classes, dropped = load_dataset(Path(a.data))
    counts = {c: int((y == i).sum()) for i, c in enumerate(classes)}
    print("Images per class after de-duplication:", counts, "| dropped:", dropped)

    Xtr, Xtmp, ytr, ytmp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=SEED)
    Xva, Xte, yva, yte = train_test_split(Xtmp, ytmp, test_size=0.50, stratify=ytmp, random_state=SEED)
    weights = {i: len(ytr) / (len(classes) * max(1, int((ytr == i).sum()))) for i in range(len(classes))}

    model = build_soil_model(len(classes))
    model.compile(optimizer=keras.optimizers.Adam(1e-3), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    cb = [
        keras.callbacks.EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True),
        keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=4, min_lr=1e-5),
    ]
    t0 = time.time()
    hist = model.fit(Xtr.astype("float32"), ytr, validation_data=(Xva.astype("float32"), yva), epochs=a.epochs, batch_size=a.batch, class_weight=weights, callbacks=cb, verbose=2)
    secs = round(time.time() - t0)

    probs = model.predict(Xte.astype("float32"), verbose=0)
    pred = probs.argmax(1)
    acc = float((pred == yte).mean())
    macro_f1 = float(f1_score(yte, pred, average="macro"))
    report = classification_report(yte, pred, labels=list(range(len(classes))), target_names=classes, output_dict=True, zero_division=0)
    print(f"\nTEST accuracy {acc:.4f} | macro-F1 {macro_f1:.4f} (n={len(yte)})")

    out_model = BASE / "app" / "model" / "soil"
    out_metrics = BASE / "models" / "soil"
    out_model.mkdir(parents=True, exist_ok=True)
    out_metrics.mkdir(parents=True, exist_ok=True)
    model.save_weights(out_model / "soil_model.weights.h5")
    (out_model / "soil_classes.json").write_text(json.dumps(classes))
    metrics = {
        "model_name": "Small CNN (from scratch)", "img_size": list(IMG_SIZE), "n_classes": len(classes), "classes": classes,
        "test_accuracy": round(acc, 4), "macro_f1": round(macro_f1, 4),
        "test_images": int(len(yte)), "train_images": int(len(ytr)), "validation_images": int(len(yva)),
        "images_per_class_after_dedup": counts, "dropped": dropped,
        "per_class": {c: {k: round(report[c][k], 4) for k in ("precision", "recall", "f1-score")} | {"support": int(report[c]["support"])} for c in classes},
        "confusion_matrix": confusion_matrix(yte, pred, labels=list(range(len(classes)))).tolist(),
        "epochs_run": len(hist.history["loss"]), "train_seconds": secs, "seed": SEED, "dataset_dir": str(a.data),
        "dataset_note": "Evaluated on a held-out split of the SAME dataset (web-collected photos). Accuracy on your own phone photos will be lower; collect your own labelled photos to measure that.",
        "limitations": [
            "Predicts broad soil TYPE from colour/texture only - not nutrients, pH, salinity or moisture.",
            "Small dataset (about a thousand images, imbalanced classes); the test set is small, so the figures are noisy.",
            "Photos in the dataset were collected from online sources; lighting/camera differences from real farm photos are not covered.",
        ],
    }
    (out_metrics / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print("Saved weights to", out_model, "and metrics to", out_metrics / "metrics.json")


if __name__ == "__main__":
    main()
