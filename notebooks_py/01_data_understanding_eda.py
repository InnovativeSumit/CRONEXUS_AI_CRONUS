#!/usr/bin/env python
# coding: utf-8

# # 🌾 CropNexus — Notebook 1: Data Understanding & Exploratory Data Analysis
# 
# This notebook looks at the raw data before we build anything. We do this first because you must understand your data well before you can clean it or train a model on it.

# ## 1. Installing Packages
# We install these libraries because our code needs them to run. This step is only needed once on a new computer.

# In[1]:


# !pip install pandas numpy matplotlib seaborn scikit-learn xgboost joblib -q


# ## 2. Import Libraries
# We import the libraries here so we can use their tools (like tables and charts) in the rest of the notebook.

# In[2]:


import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_theme(style="whitegrid", palette="Set2")
plt.rcParams["figure.figsize"] = (9, 5)
pd.set_option("display.max_columns", None)


# ## 3. Load Dataset
# We load the CSV file into a table (DataFrame) because that is the easiest way to view and work with the data in Python.

# In[3]:


df = pd.read_csv("../data/raw/Crop_recommendation.csv")
df.head()


# ## 4. Understanding Dataset
# We check the shape, column types, and stats to quickly learn what the data looks like and to catch any obvious problems early.

# In[4]:


print("Shape:", df.shape)
df.info()


# In[5]:


df.describe().T


# In[6]:


print("Missing values per column:")
print(df.isnull().sum())
print("\nDuplicate rows:", df.duplicated().sum())


# In[7]:


print("Number of crop classes:", df['label'].nunique())
df['label'].value_counts()


# ## 5. Exploratory Data Analysis (EDA)
# We explore the data with charts because pictures make patterns and problems easier to spot than plain numbers.

# ### 5.1 Class balance
# We check how many rows each crop has to make sure no crop is over- or under-represented, which could confuse the model.

# In[8]:


plt.figure(figsize=(11, 5))
df['label'].value_counts().plot(kind='bar', color=sns.color_palette("Set2"))
plt.title("Samples per Crop")
plt.ylabel("Count")
plt.xlabel("Crop")
plt.xticks(rotation=75)
plt.tight_layout()
plt.savefig("../data/processed/eda_class_balance.png", dpi=110)
plt.show()


# ### 5.2 Feature distributions
# We plot each feature's spread because knowing the normal range of values helps us catch outliers or errors.

# In[9]:


num_cols = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
fig, axes = plt.subplots(2, 4, figsize=(18, 8))
for ax, col in zip(axes.flat, num_cols):
    sns.histplot(df[col], kde=True, ax=ax, color="#3F7D4F")
    ax.set_title(col)
axes.flat[-1].axis('off')
plt.tight_layout()
plt.savefig("../data/processed/eda_distributions.png", dpi=110)
plt.show()


# ### 5.3 Correlation heatmap
# We check how features relate to each other so we know which ones move together and which give unique information.

# In[10]:


plt.figure(figsize=(8, 6))
sns.heatmap(df[num_cols].corr(), annot=True, cmap="YlGn", fmt=".2f")
plt.title("Feature Correlation Heatmap")
plt.tight_layout()
plt.savefig("../data/processed/eda_correlation.png", dpi=110)
plt.show()


# ### 5.4 Nutrient requirement per crop
# We compare N, P, K needs across crops because different nutrient levels are exactly what helps the model tell crops apart.

# In[11]:


fig, axes = plt.subplots(1, 3, figsize=(20, 6))
for ax, col in zip(axes, ['N', 'P', 'K']):
    sns.boxplot(data=df, x='label', y=col, ax=ax, palette="Set2")
    ax.set_title(f"{col} by Crop")
    ax.tick_params(axis='x', rotation=90)
plt.tight_layout()
plt.savefig("../data/processed/eda_npk_boxplots.png", dpi=110)
plt.show()


# ### 5.5 Temperature vs. Rainfall by crop cluster
# We plot temperature against rainfall to see if crops naturally group together by climate, which is useful signal for the model.

# In[12]:


plt.figure(figsize=(9, 6))
sns.scatterplot(data=df, x='temperature', y='rainfall', hue='label', legend=False, alpha=0.6, palette="tab20")
plt.title("Temperature vs. Rainfall (colored by crop)")
plt.tight_layout()
plt.savefig("../data/processed/eda_temp_rainfall.png", dpi=110)
plt.show()


# ## 6. Data Cleaning
# We remove duplicate rows because repeated data can unfairly bias the model towards those repeated examples.

# In[13]:


before = df.shape[0]
df_clean = df.drop_duplicates().reset_index(drop=True)
after = df_clean.shape[0]
print(f"Removed {before - after} duplicate row(s). Final shape: {df_clean.shape}")
df_clean.to_csv("../data/processed/crop_understood.csv", index=False)


# 
