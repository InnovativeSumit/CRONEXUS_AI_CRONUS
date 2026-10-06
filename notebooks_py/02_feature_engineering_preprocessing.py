#!/usr/bin/env python
# coding: utf-8

# # 🌾 CropNexus — Notebook 2: Feature Engineering, Preprocessing & Feature Selection
# 
# This notebook prepares the cleaned data for machine learning. We do this because models need numeric, well-scaled, well-labeled data to learn properly.

# ## Import Libraries & Load Cleaned Data
# We load the cleaned data saved from Notebook 1 so we can keep building on it without repeating the earlier steps.

# In[1]:


import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

sns.set_theme(style="whitegrid", palette="Set2")
df = pd.read_csv("../data/processed/crop_understood.csv")
df.head()


# ## 7. Feature Engineering
# We create a few new features from the existing ones because extra, meaningful combinations (like nutrient ratios) can help the model make better predictions.

# In[2]:


df["npk_sum"] = df["N"] + df["P"] + df["K"]
df["n_p_ratio"] = df["N"] / (df["P"] + 1e-6)
df["n_k_ratio"] = df["N"] / (df["K"] + 1e-6)
df["temp_humidity_index"] = df["temperature"] * df["humidity"] / 100

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall",
            "npk_sum", "n_p_ratio", "n_k_ratio", "temp_humidity_index"]
TARGET = "label"
df[FEATURES + [TARGET]].head()


# ## 8. Data Preprocessing
# We turn the crop names into numbers and scale the features because most ML models only work with numeric input, and scaling keeps every feature on a fair playing field.

# In[3]:


le = LabelEncoder()
y = le.fit_transform(df[TARGET])
X = df[FEATURES]

print("Classes:", list(le.classes_))
print("X shape:", X.shape, "| y shape:", y.shape)


# In[4]:


scaler = StandardScaler()
X_scaled_preview = pd.DataFrame(scaler.fit_transform(X), columns=FEATURES)
X_scaled_preview.describe().T[['mean', 'std', 'min', 'max']]


# ## 9. Feature Selection
# We check which features matter most so we only keep the ones that actually help the model, instead of guessing.

# In[5]:


rf_probe = RandomForestClassifier(n_estimators=200, random_state=42)
rf_probe.fit(X, y)

importance = pd.Series(rf_probe.feature_importances_, index=FEATURES).sort_values(ascending=False)
plt.figure(figsize=(8, 5))
sns.barplot(x=importance.values, y=importance.index, palette="YlGn_r")
plt.title("Feature Importance (probe Random Forest)")
plt.xlabel("Importance")
plt.tight_layout()
plt.savefig("../data/processed/feature_importance_probe.png", dpi=110)
plt.show()
importance


# All 11 features add useful information (none are near-zero), so we keep the full feature set for modelling.

# ## 10. Train-Test Split
# We split the data into train and test sets so we can check how well the model performs on data it has never seen before.

# In[6]:


X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print("Train shape:", X_train.shape, "| Test shape:", X_test.shape)


# In[7]:


import joblib, os
os.makedirs("../data/processed", exist_ok=True)
X_train.assign(label=le.inverse_transform(y_train)).to_csv("../data/processed/train.csv", index=False)
X_test.assign(label=le.inverse_transform(y_test)).to_csv("../data/processed/test.csv", index=False)
joblib.dump(scaler, "../data/processed/_scaler_preview.joblib")
joblib.dump(le, "../data/processed/_label_encoder_preview.joblib")
print("Saved processed train/test splits.")


# 
