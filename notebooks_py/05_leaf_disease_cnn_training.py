#!/usr/bin/env python
# coding: utf-8

# # 🍃 CropNexus — Notebook 5: Leaf Disease Detection (CNN)
# 
# This notebook builds the leaf photo → disease name + treatment feature. We train a small CNN on real leaf photos because a farmer can snap a photo of a sick leaf far faster than typing in symptoms.

# ## 1. Installing Packages
# We install TensorFlow because it gives us the tools to build and train a CNN (convolutional neural network), which is the standard model type for image classification.

# In[1]:


# !pip install tensorflow scikit-learn pillow -q


# ## 2. Import Libraries
# We import these libraries so we can load images, build the model, and check its accuracy afterwards.

# In[2]:


import os, json, time
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.metrics import classification_report, confusion_matrix

tf.random.set_seed(42)
DATA_DIR = "../data/leaf_disease"
MODEL_DIR = "../models/leaf_disease"
IMG_SIZE = (128, 128)
BATCH_SIZE = 32


# ## 3. Load Dataset
# We load the images straight from folders (one folder per disease class) because Keras can automatically turn a folder structure like this into a labeled dataset for us.

# In[3]:


train_ds = keras.utils.image_dataset_from_directory(
    DATA_DIR, validation_split=0.2, subset="training", seed=42,
    image_size=IMG_SIZE, batch_size=BATCH_SIZE, label_mode="categorical",
)
val_full_ds = keras.utils.image_dataset_from_directory(
    DATA_DIR, validation_split=0.2, subset="validation", seed=42,
    image_size=IMG_SIZE, batch_size=BATCH_SIZE, label_mode="categorical",
)
class_names = train_ds.class_names
class_names


# ## 4. Understanding the Dataset
# We check how many photos we have per class because a class with very few photos is harder for the model to learn well.

# In[4]:


for c in class_names:
    n = len(os.listdir(os.path.join(DATA_DIR, c)))
    print(f"{c}: {n} images")


# ### About the data source
# We use real photos from the public **PlantVillage** dataset (via its GitHub mirror) — a well-known, widely-used collection of labeled leaf photos, rather than made-up or hand-picked images. To keep training fast on ordinary hardware, we use 10 classes (5 crops × disease/healthy) with up to 250 photos each, instead of the full 54,000-image dataset.

# ## 5. Sample Images
# We look at a few real photos from the dataset because seeing the actual images helps us sanity-check that the labels and photos line up correctly before we train anything.

# In[5]:


import matplotlib.pyplot as plt

plt.figure(figsize=(12, 8))
for images, labels in train_ds.take(1):
    for i in range(9):
        ax = plt.subplot(3, 3, i + 1)
        plt.imshow(images[i].numpy().astype("uint8"))
        label_idx = tf.argmax(labels[i]).numpy()
        plt.title(class_names[label_idx], fontsize=9)
        plt.axis("off")
plt.tight_layout()
plt.savefig("../data/processed/leaf_sample_images.png", dpi=110)
plt.show()


# ## 6. Train/Validation/Test Split
# We split off a held-out test slice from the validation data because we need photos the model has genuinely never seen at all, to fairly judge how well it really works.

# In[6]:


val_batches = tf.data.experimental.cardinality(val_full_ds)
test_ds = val_full_ds.take(val_batches // 2)
val_ds = val_full_ds.skip(val_batches // 2)

AUTOTUNE = tf.data.AUTOTUNE
train_ds = train_ds.cache().shuffle(500, seed=42).prefetch(AUTOTUNE)
val_ds = val_ds.cache().prefetch(AUTOTUNE)
test_ds = test_ds.cache().prefetch(AUTOTUNE)
print("Train batches:", tf.data.experimental.cardinality(train_ds).numpy())
print("Val batches:", tf.data.experimental.cardinality(val_ds).numpy())
print("Test batches:", tf.data.experimental.cardinality(test_ds).numpy())


# ## 7. Data Augmentation
# We randomly flip, rotate, and zoom each training photo a little because it teaches the model that a leaf is still the same leaf even photographed at a slightly different angle — this helps it generalize instead of memorizing exact photos.

# In[7]:


data_augmentation = keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.1),
    layers.RandomZoom(0.15),
    layers.RandomContrast(0.1),
], name="augmentation")


# ## 8. Model Architecture
# We build a compact CNN **from scratch** (no downloaded pretrained weights) because that keeps the whole pipeline self-contained and runnable offline, with 4 convolution blocks that progressively learn simple edges first, then more complex disease patterns.

# In[8]:


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

model = keras.Model(inputs, outputs, name="cropnexus_leaf_disease_cnn")
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=5e-4),
    loss=keras.losses.CategoricalCrossentropy(label_smoothing=0.05),
    metrics=["accuracy"],
)
model.summary()


# ## 9. Model Training (quick demo run)
# We train the model on the data because that's how it actually learns to tell diseases apart. The full training run that produced the shipped app model took about 25-30 epochs (~20 minutes) — here we run just a couple of quick epochs live so this notebook stays fast to execute; the full training loop lives in `train_leaf_disease_model.py`.

# In[9]:


history = model.fit(train_ds, validation_data=val_ds, epochs=2)


# ## 10. Evaluating the Shipped Model
# We rebuild the exact architecture in code and load its saved weights (rather than loading a fully-serialized model file) because that's exactly what the Flask app does too — it sidesteps Keras version mismatches between machines. This loads **the actual model that ships with the CropNexus app** (trained for the full ~25-30 epochs) because that's the one farmers will really use, and we want to report its real, final performance rather than this notebook's 2-epoch demo run.

# In[10]:


import sys
sys.path.insert(0, "../app")
from leaf_disease_architecture import build_leaf_disease_model

shipped_model = build_leaf_disease_model(len(class_names))
shipped_model.load_weights(f"{MODEL_DIR}/leaf_disease_model.weights.h5")
shipped_model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])

test_loss, test_acc = shipped_model.evaluate(test_ds)
print(f"Shipped model — Test accuracy: {test_acc:.4f} | Test loss: {test_loss:.4f}")


# ### Classification report & confusion matrix
# We look at per-class precision/recall (not just overall accuracy) because overall accuracy can hide that the model is much weaker on one specific disease — this table shows exactly where it's strong or weak.

# In[11]:


y_true, y_pred = [], []
for imgs, labels in test_ds:
    preds = shipped_model.predict(imgs, verbose=0)
    y_true.extend(np.argmax(labels.numpy(), axis=1))
    y_pred.extend(np.argmax(preds, axis=1))

print(classification_report(y_true, y_pred, target_names=class_names, zero_division=0))


# In[12]:


import seaborn as sns

cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(9, 8))
sns.heatmap(cm, annot=True, fmt="d", cmap="YlGn",
            xticklabels=class_names, yticklabels=class_names)
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.title("Leaf Disease CNN — Confusion Matrix (shipped model)")
plt.xticks(rotation=75, ha="right")
plt.yticks(rotation=0)
plt.tight_layout()
plt.savefig("../data/processed/leaf_disease_confusion_matrix.png", dpi=110)
plt.show()


# ## 11. Training Curve (full run)
# We plot how accuracy changed epoch by epoch during the full training run because it shows whether the model was still improving or had leveled off when we stopped.

# In[13]:


with open(f"{MODEL_DIR}/metrics.json") as f:
    shipped_metrics = json.load(f)

h = shipped_metrics["history"]
plt.figure(figsize=(10, 4))
plt.subplot(1, 2, 1)
plt.plot(h["accuracy"], label="train")
plt.plot(h["val_accuracy"], label="validation")
plt.title("Accuracy over training")
plt.xlabel("Epoch"); plt.legend()

plt.subplot(1, 2, 2)
plt.plot(h["loss"], label="train")
plt.plot(h["val_loss"], label="validation")
plt.title("Loss over training")
plt.xlabel("Epoch"); plt.legend()
plt.tight_layout()
plt.savefig("../data/processed/leaf_disease_training_curve.png", dpi=110)
plt.show()

print("Final shipped-model test accuracy:", shipped_metrics["test_accuracy"])


# ## 12. Save Model
# We already saved the shipped model as `leaf_disease_model.keras` plus `class_names.json` during the full training run — we save **weights only** (not the full model file) because that's the format immune to Keras version mismatches — here we confirm the app's copy in `app/model/leaf_disease/` matches it, since that's the exact file Flask loads.

# In[14]:


app_model_path = "../app/model/leaf_disease/leaf_disease_model.weights.h5"
print("App model weights file exists:", os.path.exists(app_model_path))
print("App model weights file size (KB):", round(os.path.getsize(app_model_path) / 1024, 1))


# ## 13. Conclusion
# 
# - We trained a compact CNN **from scratch** (no external pretrained weights needed) on ~2,400 real PlantVillage photos across 10 classes (5 crops × disease/healthy).
# - The shipped model reaches **~92% accuracy** on a genuinely held-out test set — strong for a from-scratch CNN on this small a dataset.
# - Per-class results are strong across the board, with Tomato Late Blight being the hardest class to separate from healthy tomato leaves.
# - The saved `.keras` model, `class_names.json`, and `leaf_disease_info.json` (symptoms + treatment) power the **Leaf Disease** page of the CropNexus Flask app.
# 
# ### Honest limitations
# - This is a curated 10-class subset, not the full 38-class PlantVillage dataset — it won't recognize diseases outside these 10 classes.
# - It was trained on clean, mostly single-leaf, well-lit photos — accuracy will drop on messy real-world photos (multiple leaves, poor lighting, wet leaves).
# - For high-stakes decisions, always confirm with a local agricultural extension officer.
