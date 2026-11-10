"""
CropNexus - soil-photo classifier architecture (TensorFlow / Keras).
Kept in code (like the leaf model) so only the *weights* are saved: that avoids the
Keras version-specific deserialization errors some machines hit with full-model files.
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

IMG_SIZE = (160, 160)


def build_soil_model(n_classes: int, img_size=IMG_SIZE) -> keras.Model:
    inputs = keras.Input(shape=(*img_size, 3))
    x = layers.Rescaling(1.0 / 255)(inputs)
    # Augmentation is only active during training; it simulates different lighting / framing of phone photos
    x = layers.RandomFlip("horizontal_and_vertical")(x)
    x = layers.RandomRotation(0.1)(x)
    x = layers.RandomZoom(0.15)(x)
    x = layers.RandomBrightness(0.2, value_range=(0, 1))(x)
    x = layers.RandomContrast(0.2)(x)
    for filters in (32, 64, 96, 128):
        x = layers.Conv2D(filters, 3, padding="same", use_bias=False)(x)
        x = layers.BatchNormalization()(x)
        x = layers.Activation("relu")(x)
        x = layers.MaxPooling2D()(x)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(64, activation="relu")(x)
    outputs = layers.Dense(n_classes, activation="softmax")(x)
    return keras.Model(inputs, outputs, name="cropnexus_soil_cnn")
