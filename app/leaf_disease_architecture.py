"""
CropNexus — Leaf Disease CNN architecture (single source of truth).

Loading a fully-serialized Keras model (.keras) across different Keras/TF
versions can break due to config-format changes between versions (this bit
us once — see README). Rebuilding the architecture in plain code and loading
*weights only* sidesteps that entirely: weight arrays are just numbers, no
config deserialization involved, so this works reliably across machines
even when the exact Keras version differs from the one used to train.
"""
from tensorflow import keras
from tensorflow.keras import layers

IMG_SIZE = (128, 128)


def conv_block(x, filters):
    x = layers.Conv2D(filters, 3, padding="same", activation="relu",
                       kernel_regularizer=keras.regularizers.l2(1e-4))(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D()(x)
    return x


def build_leaf_disease_model(n_classes):
    data_augmentation = keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.1),
        layers.RandomZoom(0.15),
        layers.RandomContrast(0.1),
    ], name="augmentation")

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
    outputs = layers.Dense(n_classes, activation="softmax")(x)

    return keras.Model(inputs, outputs, name="cropnexus_leaf_disease_cnn")
