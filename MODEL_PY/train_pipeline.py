"""
CropNexus - Model Training Pipeline
This script is the single source of truth for the model. The notebooks
(01-04) mirror these exact steps section by section for the presentation.
"""
import json, time, warnings, os
import numpy as np
import pandas as pd
import joblib
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, ExtraTreesClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
from xgboost import XGBClassifier

RANDOM_STATE = 42
BASE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# 1. LOAD
# ---------------------------------------------------------------------------
df = pd.read_csv(f"{BASE}/data/raw/Crop_recommendation.csv")
print("Shape:", df.shape)
print("Nulls:", df.isnull().sum().sum())
print("Duplicates:", df.duplicated().sum())
df = df.drop_duplicates().reset_index(drop=True)

# ---------------------------------------------------------------------------
# 2. FEATURE ENGINEERING
# ---------------------------------------------------------------------------
df["npk_sum"] = df["N"] + df["P"] + df["K"]
df["n_p_ratio"] = df["N"] / (df["P"] + 1e-6)
df["n_k_ratio"] = df["N"] / (df["K"] + 1e-6)
df["temp_humidity_index"] = df["temperature"] * df["humidity"] / 100

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall",
            "npk_sum", "n_p_ratio", "n_k_ratio", "temp_humidity_index"]
TARGET = "label"

# ---------------------------------------------------------------------------
# 3. ENCODE + SPLIT
# ---------------------------------------------------------------------------
le = LabelEncoder()
y = le.fit_transform(df[TARGET])
X = df[FEATURES]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)

# ---------------------------------------------------------------------------
# 4. MODEL COMPARISON (baseline, cross-validated)
# ---------------------------------------------------------------------------
models = {
    "Logistic Regression": (LogisticRegression(max_iter=1000, random_state=RANDOM_STATE), True),
    "K-Nearest Neighbors": (KNeighborsClassifier(n_neighbors=5), True),
    "Naive Bayes": (GaussianNB(), True),
    "Decision Tree": (DecisionTreeClassifier(random_state=RANDOM_STATE), False),
    "Random Forest": (RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE), False),
    "Extra Trees": (ExtraTreesClassifier(n_estimators=200, random_state=RANDOM_STATE), False),
    "Gradient Boosting": (GradientBoostingClassifier(random_state=RANDOM_STATE), False),
    "SVM (RBF)": (SVC(kernel="rbf", probability=True, random_state=RANDOM_STATE), True),
    "XGBoost": (XGBClassifier(eval_metric="mlogloss", random_state=RANDOM_STATE), False),
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
results = []
for name, (model, needs_scaling) in models.items():
    Xtr = X_train_s if needs_scaling else X_train
    Xte = X_test_s if needs_scaling else X_test
    t0 = time.time()
    model.fit(Xtr, y_train)
    train_time = time.time() - t0
    preds = model.predict(Xte)
    cv_scores = cross_val_score(model, X_train_s if needs_scaling else X_train, y_train, cv=cv, scoring="accuracy")
    results.append({
        "Model": name,
        "Test Accuracy": round(accuracy_score(y_test, preds), 4),
        "Precision": round(precision_score(y_test, preds, average="weighted"), 4),
        "Recall": round(recall_score(y_test, preds, average="weighted"), 4),
        "F1 Score": round(f1_score(y_test, preds, average="weighted"), 4),
        "CV Mean Accuracy": round(cv_scores.mean(), 4),
        "CV Std": round(cv_scores.std(), 4),
        "Train Time (s)": round(train_time, 3),
    })

results_df = pd.DataFrame(results).sort_values("Test Accuracy", ascending=False).reset_index(drop=True)
print("\n=== MODEL COMPARISON ===")
print(results_df.to_string(index=False))

# ---------------------------------------------------------------------------
# 5. HYPERPARAMETER TUNING (top 2 candidates)
# ---------------------------------------------------------------------------
top2 = results_df["Model"].tolist()[:2]
print("\nTuning candidates:", top2)

tuned_models = {}

if "Random Forest" in top2:
    rf_grid = {
        "n_estimators": [150, 250, 350],
        "max_depth": [None, 12, 20],
        "min_samples_split": [2, 4],
    }
    gs = GridSearchCV(RandomForestClassifier(random_state=RANDOM_STATE), rf_grid, cv=3, scoring="accuracy", n_jobs=-1)
    gs.fit(X_train, y_train)
    tuned_models["Random Forest (Tuned)"] = (gs.best_estimator_, False, gs.best_params_)

if "XGBoost" in top2:
    xgb_grid = {
        "n_estimators": [150, 250],
        "max_depth": [4, 6, 8],
        "learning_rate": [0.05, 0.1, 0.2],
    }
    gs = GridSearchCV(XGBClassifier(eval_metric="mlogloss", random_state=RANDOM_STATE), xgb_grid, cv=3, scoring="accuracy", n_jobs=-1)
    gs.fit(X_train, y_train)
    tuned_models["XGBoost (Tuned)"] = (gs.best_estimator_, False, gs.best_params_)

if "Extra Trees" in top2:
    et_grid = {"n_estimators": [150, 250, 350], "max_depth": [None, 15, 25]}
    gs = GridSearchCV(ExtraTreesClassifier(random_state=RANDOM_STATE), et_grid, cv=3, scoring="accuracy", n_jobs=-1)
    gs.fit(X_train, y_train)
    tuned_models["Extra Trees (Tuned)"] = (gs.best_estimator_, False, gs.best_params_)

if "Gradient Boosting" in top2:
    gb_grid = {"n_estimators": [150, 250], "max_depth": [2, 3, 4], "learning_rate": [0.05, 0.1]}
    gs = GridSearchCV(GradientBoostingClassifier(random_state=RANDOM_STATE), gb_grid, cv=3, scoring="accuracy", n_jobs=-1)
    gs.fit(X_train, y_train)
    tuned_models["Gradient Boosting (Tuned)"] = (gs.best_estimator_, False, gs.best_params_)

tuned_results = []
for name, (model, needs_scaling, params) in tuned_models.items():
    Xte = X_test_s if needs_scaling else X_test
    preds = model.predict(Xte)
    tuned_results.append({
        "Model": name,
        "Test Accuracy": round(accuracy_score(y_test, preds), 4),
        "F1 Score": round(f1_score(y_test, preds, average="weighted"), 4),
        "Best Params": params,
    })
tuned_df = pd.DataFrame(tuned_results).sort_values("Test Accuracy", ascending=False).reset_index(drop=True)
print("\n=== TUNED MODEL RESULTS ===")
print(tuned_df.to_string(index=False))

# ---------------------------------------------------------------------------
# 6. FINAL MODEL SELECTION
# ---------------------------------------------------------------------------
best_tuned_name = tuned_df.iloc[0]["Model"]
best_model, best_needs_scaling, best_params = tuned_models[best_tuned_name]
final_preds = best_model.predict(X_test_s if best_needs_scaling else X_test)
final_acc = accuracy_score(y_test, final_preds)
final_f1 = f1_score(y_test, final_preds, average="weighted")
final_report = classification_report(y_test, final_preds, target_names=le.classes_, output_dict=True)
final_cm = confusion_matrix(y_test, final_preds).tolist()

print(f"\n=== FINAL MODEL: {best_tuned_name} ===")
print("Test Accuracy:", round(final_acc, 4))
print("Weighted F1:", round(final_f1, 4))

# Feature importance (if available)
feat_importance = {}
if hasattr(best_model, "feature_importances_"):
    feat_importance = dict(sorted(
        zip(FEATURES, best_model.feature_importances_.tolist()),
        key=lambda x: x[1], reverse=True
    ))

# ---------------------------------------------------------------------------
# 7. SAVE ARTIFACTS
# ---------------------------------------------------------------------------
os.makedirs(f"{BASE}/models", exist_ok=True)
joblib.dump(best_model, f"{BASE}/models/cropnexus_model.joblib")
joblib.dump(scaler, f"{BASE}/models/scaler.joblib")
joblib.dump(le, f"{BASE}/models/label_encoder.joblib")
joblib.dump(FEATURES, f"{BASE}/models/feature_names.joblib")

metrics = {
    "final_model_name": best_tuned_name,
    "uses_scaling": best_needs_scaling,
    "best_params": best_params,
    "test_accuracy": round(final_acc, 4),
    "weighted_f1": round(final_f1, 4),
    "n_classes": len(le.classes_),
    "classes": le.classes_.tolist(),
    "confusion_matrix": final_cm,
    "classification_report": final_report,
    "feature_importance": feat_importance,
    "model_comparison": results_df.to_dict(orient="records"),
    "tuned_comparison": [
        {"Model": r["Model"], "Test Accuracy": r["Test Accuracy"], "F1 Score": r["F1 Score"]}
        for r in tuned_results
    ],
    "features_used": FEATURES,
}
with open(f"{BASE}/models/metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

# Per-crop average NPK / conditions -> used by Flask app for fertilizer & irrigation rules
crop_profile = df.groupby("label")[["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]].mean().round(2)
crop_profile.to_json(f"{BASE}/app/database/crop_profile.json", orient="index", indent=2)

# Save cleaned/processed data for notebooks 2-4 to reuse
df.to_csv(f"{BASE}/data/processed/crop_cleaned.csv", index=False)
X_train.assign(label=le.inverse_transform(y_train)).to_csv(f"{BASE}/data/processed/train.csv", index=False)
X_test.assign(label=le.inverse_transform(y_test)).to_csv(f"{BASE}/data/processed/test.csv", index=False)

print("\nSaved model, scaler, label encoder, metrics.json, crop_profile.json, processed CSVs.")
