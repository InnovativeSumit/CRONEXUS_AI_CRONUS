"""
CropNexus — Leaf Disease Model Finalization
Loads the trained checkpoint, evaluates it on the held-out test slice, and
saves the final model + metrics.json for the Flask app to use. Run this
once training (train_leaf_disease_model.py) has reached a good accuracy.
"""
import os, json
import numpy as np
import tensorflow as tf
from tensorflow import keras
from sklearn.metrics import classification_report, confusion_matrix

RANDOM_STATE = 42
BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = f"{BASE}/data/leaf_disease"
MODEL_DIR = f"{BASE}/models/leaf_disease"
CKPT_PATH = f"{MODEL_DIR}/_checkpoint_best.keras"
HISTORY_PATH = f"{MODEL_DIR}/_history.json"

IMG_SIZE = (128, 128)
BATCH_SIZE = 32
SEED = RANDOM_STATE

val_full_ds = keras.utils.image_dataset_from_directory(
    DATA_DIR, validation_split=0.2, subset="validation", seed=SEED,
    image_size=IMG_SIZE, batch_size=BATCH_SIZE, label_mode="categorical",
)
class_names = val_full_ds.class_names
val_batches = tf.data.experimental.cardinality(val_full_ds)
test_ds = val_full_ds.take(val_batches // 2).cache().prefetch(tf.data.AUTOTUNE)

print("Loading checkpoint:", CKPT_PATH)
model = keras.models.load_model(CKPT_PATH)

test_loss, test_acc = model.evaluate(test_ds)
print(f"Test accuracy: {test_acc:.4f} | Test loss: {test_loss:.4f}")

y_true, y_pred = [], []
for imgs, labels in test_ds:
    preds = model.predict(imgs, verbose=0)
    y_true.extend(np.argmax(labels.numpy(), axis=1))
    y_pred.extend(np.argmax(preds, axis=1))

report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True, zero_division=0)
cm = confusion_matrix(y_true, y_pred).tolist()
print(classification_report(y_true, y_pred, target_names=class_names, zero_division=0))

model.save(f"{MODEL_DIR}/leaf_disease_model.keras")
# Also save weights-only: rebuilding the architecture in code + load_weights()
# is what the Flask app actually uses, since it's immune to Keras version
# mismatches between the machine that trained this and the machine running it.
model.save_weights(f"{MODEL_DIR}/leaf_disease_model.weights.h5")

with open(HISTORY_PATH) as f:
    history = json.load(f)

metrics = {
    "model_name": "Custom CNN (trained from scratch, 4 conv blocks)",
    "image_size": list(IMG_SIZE),
    "classes": class_names,
    "n_classes": len(class_names),
    "test_accuracy": round(float(test_acc), 4),
    "test_loss": round(float(test_loss), 4),
    "classification_report": report,
    "confusion_matrix": cm,
    "epochs_trained": len(history["loss"]),
    "history": history,
}
with open(f"{MODEL_DIR}/metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

print("\nSaved final model + metrics.json to", MODEL_DIR)
