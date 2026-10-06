"""
CropNexus — Leaf Disease Detection Model Training
A compact CNN trained FROM SCRATCH on real PlantVillage photos (no external
pretrained-weight download required, so it runs anywhere with no network
access at train time — only the dataset needs to be present locally).
"""
import os, json, time
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

RANDOM_STATE = 42
tf.random.set_seed(RANDOM_STATE)

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = f"{BASE}/data/leaf_disease"
MODEL_DIR = f"{BASE}/models/leaf_disease"
os.makedirs(MODEL_DIR, exist_ok=True)

IMG_SIZE = (128, 128)
BATCH_SIZE = 32
SEED = RANDOM_STATE
EPOCHS_PER_RUN = int(os.environ.get("EPOCHS_PER_RUN", "30"))
CKPT_PATH = f"{MODEL_DIR}/_checkpoint.keras"
BEST_CKPT_PATH = f"{MODEL_DIR}/_checkpoint_best.keras"
HISTORY_PATH = f"{MODEL_DIR}/_history.json"

# ---------------------------------------------------------------------------
# 1. Load dataset (80% train, 20% validation), then carve a test slice
# ---------------------------------------------------------------------------
train_ds = keras.utils.image_dataset_from_directory(
    DATA_DIR, validation_split=0.2, subset="training", seed=SEED,
    image_size=IMG_SIZE, batch_size=BATCH_SIZE, label_mode="categorical",
)
val_full_ds = keras.utils.image_dataset_from_directory(
    DATA_DIR, validation_split=0.2, subset="validation", seed=SEED,
    image_size=IMG_SIZE, batch_size=BATCH_SIZE, label_mode="categorical",
)

class_names = train_ds.class_names
print("Classes:", class_names)
with open(f"{MODEL_DIR}/class_names.json", "w") as f:
    json.dump(class_names, f, indent=2)

# Split the validation set in half -> validation (for training) + held-out test
val_batches = tf.data.experimental.cardinality(val_full_ds)
test_ds = val_full_ds.take(val_batches // 2)
val_ds = val_full_ds.skip(val_batches // 2)

AUTOTUNE = tf.data.AUTOTUNE
train_ds = train_ds.cache().shuffle(500, seed=SEED).prefetch(AUTOTUNE)
val_ds = val_ds.cache().prefetch(AUTOTUNE)
test_ds = test_ds.cache().prefetch(AUTOTUNE)

# ---------------------------------------------------------------------------
# 2. Build a compact CNN, trained from scratch (no pretrained weights)
# ---------------------------------------------------------------------------
data_augmentation = keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.1),
    layers.RandomZoom(0.15),
    layers.RandomContrast(0.1),
], name="augmentation")


def conv_block(x, filters):
    x = layers.Conv2D(filters, 3, padding="same", activation="relu",
                       kernel_regularizer=keras.regularizers.l2(1e-4))(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D()(x)
    return x


inputs = keras.Input(shape=IMG_SIZE + (3,))
x = data_augmentation(inputs)
x = layers.Rescaling(1.0 / 255)(x)
x = conv_block(x, 32)
x = conv_block(x, 64)
x = conv_block(x, 128)
x = conv_block(x, 128)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.5)(x)
x = layers.Dense(64, activation="relu", kernel_regularizer=keras.regularizers.l2(1e-4))(x)
x = layers.Dropout(0.4)(x)
outputs = layers.Dense(len(class_names), activation="softmax")(x)

if os.path.exists(CKPT_PATH):
    print(f"Resuming from checkpoint: {CKPT_PATH}")
    model = keras.models.load_model(CKPT_PATH)
else:
    model = keras.Model(inputs, outputs, name="cropnexus_leaf_disease_cnn")
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=5e-4),
        loss=keras.losses.CategoricalCrossentropy(label_smoothing=0.05),
        metrics=["accuracy"],
    )
model.summary()

# ---------------------------------------------------------------------------
# 3. Train (resumable: saves a checkpoint + history after every epoch so a
#    single run can be safely re-invoked to continue training)
# ---------------------------------------------------------------------------
prev_history = {}
if os.path.exists(HISTORY_PATH):
    with open(HISTORY_PATH) as f:
        prev_history = json.load(f)
already_trained_epochs = len(prev_history.get("loss", []))
print(f"Already-trained epochs: {already_trained_epochs}")


class SaveHistoryEachEpoch(keras.callbacks.Callback):
    """Persists metrics to disk after every single epoch so progress
    survives even if this process gets interrupted mid-run."""
    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        current = {}
        if os.path.exists(HISTORY_PATH):
            with open(HISTORY_PATH) as f:
                current = json.load(f)
        for k, v in logs.items():
            current.setdefault(k, []).append(round(float(v), 4))
        with open(HISTORY_PATH, "w") as f:
            json.dump(current, f, indent=2)


callbacks = [
    keras.callbacks.ModelCheckpoint(CKPT_PATH, save_best_only=False),
    keras.callbacks.ModelCheckpoint(BEST_CKPT_PATH, save_best_only=True, monitor="val_accuracy"),
    SaveHistoryEachEpoch(),
    keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=6, restore_best_weights=True),
    keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3),
]

t0 = time.time()
history = model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS_PER_RUN, callbacks=callbacks)
train_time = time.time() - t0
print(f"\nThis run took {train_time/60:.1f} minutes")

# merged_history is now simply what's on disk (kept current by the callback)
with open(HISTORY_PATH) as f:
    merged_history = json.load(f)
print(f"Total epochs trained so far: {len(merged_history['loss'])}")
print(f"Latest val_accuracy: {merged_history['val_accuracy'][-1]}")
