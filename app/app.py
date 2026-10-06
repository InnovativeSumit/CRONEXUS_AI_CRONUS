"""
CropNexus — AI Farmer Crop Advisory System
Flask backend. Data is persisted with a lightweight JSON file "database"
(app/database/*.json) — no external DB server required.
"""
import os
import json
import uuid
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()  # reads .env for MONGO_URI, JWT_SECRET, SECRET_KEY, etc.

import joblib
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_from_directory, session, g
from flask_cors import CORS
from PIL import Image

import auth
from i18n import get_translations, LANGUAGES, DEFAULT_LANGUAGE

# TensorFlow is only needed for the leaf disease CNN. Imported lazily-safe:
# if it's missing for any reason, the rest of the app (crop advisory) still works.
try:
    import tensorflow as tf
    from leaf_disease_architecture import build_leaf_disease_model, IMG_SIZE as LEAF_IMG_SIZE
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    LEAF_IMG_SIZE = (128, 128)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
DB_DIR = os.path.join(BASE_DIR, "database")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
ALLOWED_IMG = {"png", "jpg", "jpeg", "webp"}
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "cropnexus-dev-secret-key")
app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024  # 12 MB uploads (phone camera photos can be large)
# Enables the React Native / Expo app (and Expo web) to call these JSON APIs
# from a different origin. Native fetch on iOS/Android isn't subject to CORS
# at all, but this keeps things working for the Expo web target too.
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.before_request
def load_logged_in_user():
    g.user = None
    user_id = session.get("user_id")
    if user_id:
        doc = auth.find_user_by_id(user_id)
        g.user = auth.public_user(doc) if doc else None


@app.context_processor
def inject_globals():
    lang = session.get("lang", DEFAULT_LANGUAGE)
    return {
        "current_user": g.get("user"),
        "t": get_translations(lang),
        "current_lang": lang,
        "languages": LANGUAGES,
    }


@app.route("/set-language/<lang_code>")
def set_language(lang_code):
    if lang_code in LANGUAGES:
        session["lang"] = lang_code
    return redirect(request.referrer or url_for("index"))

# ---------------------------------------------------------------------------
# Load ML artifacts once at startup
# ---------------------------------------------------------------------------
model = joblib.load(os.path.join(MODEL_DIR, "cropnexus_model.joblib"))
scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.joblib"))
label_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder.joblib"))
FEATURES = joblib.load(os.path.join(MODEL_DIR, "feature_names.joblib"))

with open(os.path.join(BASE_DIR, "..", "models", "metrics.json")) as f:
    METRICS = json.load(f)

with open(os.path.join(DB_DIR, "crop_info.json")) as f:
    CROP_INFO = json.load(f)

with open(os.path.join(DB_DIR, "leaf_disease_info.json")) as f:
    LEAF_DISEASE_INFO = json.load(f)

# ---------------------------------------------------------------------------
# Load the leaf disease CNN (lazy: only if TensorFlow + model files exist)
# ---------------------------------------------------------------------------
LEAF_MODEL_DIR = os.path.join(MODEL_DIR, "leaf_disease")
LEAF_MODEL = None
LEAF_CLASS_NAMES = []

if TF_AVAILABLE and os.path.exists(os.path.join(LEAF_MODEL_DIR, "leaf_disease_model.weights.h5")):
    with open(os.path.join(LEAF_MODEL_DIR, "class_names.json")) as f:
        LEAF_CLASS_NAMES = json.load(f)
    # Rebuild the exact architecture in code, then load weights only — this
    # avoids brittle full-model (.keras) deserialization breaking across
    # different Keras/TensorFlow versions on different machines.
    LEAF_MODEL = build_leaf_disease_model(len(LEAF_CLASS_NAMES))
    LEAF_MODEL.load_weights(os.path.join(LEAF_MODEL_DIR, "leaf_disease_model.weights.h5"))

LEAF_METRICS = None
_leaf_metrics_path = os.path.join(BASE_DIR, "..", "models", "leaf_disease", "metrics.json")
if os.path.exists(_leaf_metrics_path):
    with open(_leaf_metrics_path) as f:
        LEAF_METRICS = json.load(f)


# ---------------------------------------------------------------------------
# Tiny JSON "database" helpers
# ---------------------------------------------------------------------------
def read_json(name):
    path = os.path.join(DB_DIR, name)
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)


def write_json(name, data):
    path = os.path.join(DB_DIR, name)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


# ---------------------------------------------------------------------------
# Domain logic
# ---------------------------------------------------------------------------
def build_feature_vector(form):
    N = float(form["nitrogen"])
    P = float(form["phosphorus"])
    K = float(form["potassium"])
    temperature = float(form["temperature"])
    humidity = float(form["humidity"])
    ph = float(form["ph"])
    rainfall = float(form["rainfall"])

    npk_sum = N + P + K
    n_p_ratio = N / (P + 1e-6)
    n_k_ratio = N / (K + 1e-6)
    temp_humidity_index = temperature * humidity / 100

    raw = {
        "N": N, "P": P, "K": K, "temperature": temperature, "humidity": humidity,
        "ph": ph, "rainfall": rainfall, "npk_sum": npk_sum, "n_p_ratio": n_p_ratio,
        "n_k_ratio": n_k_ratio, "temp_humidity_index": temp_humidity_index,
    }
    vector = pd.DataFrame([[raw[f] for f in FEATURES]], columns=FEATURES)
    return vector, raw


def predict_crop(vector):
    scaled = pd.DataFrame(scaler.transform(vector), columns=FEATURES) if METRICS.get("uses_scaling") else vector
    probs = model.predict_proba(scaled)[0]
    top_idx = np.argsort(probs)[::-1][:3]
    top_crops = [
        {"crop": label_encoder.inverse_transform([i])[0], "confidence": round(float(probs[i]) * 100, 2)}
        for i in top_idx
    ]
    return top_crops


def nutrient_advice(raw, predicted_crop):
    info = CROP_INFO.get(predicted_crop, {})
    ideal = info.get("ideal_conditions", {})
    tips = []
    for nutrient, key in [("Nitrogen", "N"), ("Phosphorus", "P"), ("Potassium", "K")]:
        if key in ideal:
            diff = raw[key] - ideal[key]
            if diff < -15:
                tips.append(f"{nutrient} is notably below the ideal range for {predicted_crop} — consider a top-up.")
            elif diff > 15:
                tips.append(f"{nutrient} is above what {predicted_crop} typically needs — reduce next dose.")
    if not tips:
        tips.append("Your soil nutrient levels are close to the ideal range for this crop.")
    return tips


def predict_leaf_disease(filepath):
    """Runs the trained CNN on an uploaded leaf photo and returns the top
    prediction plus its confidence, alongside the disease knowledge-base
    entry (symptoms + treatment) for that class."""
    img = Image.open(filepath).convert("RGB").resize(LEAF_IMG_SIZE)
    arr = np.array(img, dtype="float32")
    batch = np.expand_dims(arr, axis=0)  # model has its own internal Rescaling layer

    probs = LEAF_MODEL.predict(batch, verbose=0)[0]
    top_idx = np.argsort(probs)[::-1][:3]
    top_predictions = [
        {"class": LEAF_CLASS_NAMES[i], "confidence": round(float(probs[i]) * 100, 2)}
        for i in top_idx
    ]
    best_class = top_predictions[0]["class"]
    info = LEAF_DISEASE_INFO.get(best_class, {})
    return top_predictions, info


# ---------------------------------------------------------------------------
# Shared request-handling logic (used by both the HTML routes and the JSON
# API routes, so mobile app requests and web form submissions behave
# identically — including writing to advisory_history.json).
# ---------------------------------------------------------------------------
def run_advisory(form):
    """form: any dict-like object with the 9 advisory fields (request.form
    for the web route, or a plain dict decoded from JSON for the API route).
    Returns (record, info, tips) or raises KeyError/ValueError on bad input."""
    vector, raw = build_feature_vector(form)
    top_crops = predict_crop(vector)
    best_crop = top_crops[0]["crop"]
    info = CROP_INFO.get(best_crop, {})
    tips = nutrient_advice(raw, best_crop)

    record = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "location": form.get("location", ""),
        "soil_type": form.get("soil_type", ""),
        "inputs": raw,
        "top_crops": top_crops,
        "recommended_crop": best_crop,
    }
    history = read_json("advisory_history.json")
    history.insert(0, record)
    write_json("advisory_history.json", history[:200])  # cap history size

    return record, info, tips


def run_leaf_disease(file_storage):
    """file_storage: a Werkzeug FileStorage (from request.files). Saves the
    upload, runs the CNN, and returns (result_dict) or raises ValueError."""
    if not file_storage or file_storage.filename == "":
        raise ValueError("Please choose a leaf image to upload.")

    ext = file_storage.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_IMG:
        raise ValueError("Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP image.")

    filename = f"{uuid.uuid4().hex[:10]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    file_storage.save(filepath)

    top_predictions, info = predict_leaf_disease(filepath)
    return {
        "filename": filename,
        "image_url": url_for("uploaded_file", filename=filename),
        "top_predictions": top_predictions,
        "info": info,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    if not g.user:
        return render_template("landing.html", accuracy=METRICS["test_accuracy"],
                                model_name=METRICS["final_model_name"], n_classes=METRICS["n_classes"])
    return render_template("index.html", accuracy=METRICS["test_accuracy"], model_name=METRICS["final_model_name"],
                            n_classes=METRICS["n_classes"])


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if g.user:
        return redirect(url_for("index"))
    if request.method == "GET":
        return render_template("signup.html")

    try:
        user = auth.create_user(request.form.get("name", ""), request.form.get("email", ""), request.form.get("password", ""))
    except auth.AuthError as e:
        flash(str(e), "error")
        return redirect(url_for("signup"))

    session["user_id"] = str(user["_id"])
    flash("Welcome to CropNexus!", "success")
    return redirect(url_for("index"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if g.user:
        return redirect(url_for("index"))
    if request.method == "GET":
        return render_template("login.html")

    try:
        user = auth.authenticate_user(request.form.get("email", ""), request.form.get("password", ""))
    except auth.AuthError as e:
        flash(str(e), "error")
        return redirect(url_for("login"))

    session["user_id"] = str(user["_id"])
    next_url = request.args.get("next") or url_for("index")
    return redirect(next_url)


@app.route("/logout")
def logout():
    session.pop("user_id", None)
    return redirect(url_for("index"))


@app.route("/advisory", methods=["GET", "POST"])
@auth.login_required
def advisory():
    if request.method == "GET":
        return render_template("advisory.html")

    try:
        record, info, tips = run_advisory(request.form)
    except (KeyError, ValueError):
        flash("Please fill in all fields with valid numbers.", "error")
        return redirect(url_for("advisory"))

    return render_template(
        "result.html",
        record=record,
        info=info,
        tips=tips,
    )


@app.route("/leaf-disease", methods=["GET", "POST"])
@auth.login_required
def leaf_disease():
    if request.method == "GET":
        return render_template("leaf_disease.html", result=None, model_ready=LEAF_MODEL is not None)

    if LEAF_MODEL is None:
        flash("The leaf disease model isn't available on this server. Make sure TensorFlow is installed and the model files are present.", "error")
        return redirect(url_for("leaf_disease"))

    try:
        result = run_leaf_disease(request.files.get("leaf_image"))
    except ValueError as e:
        flash(str(e), "error")
        return redirect(url_for("leaf_disease"))
    return render_template("leaf_disease.html", result=result, model_ready=True)


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/history")
@auth.login_required
def history():
    records = read_json("advisory_history.json")
    return render_template("history.html", records=records)


@app.route("/about")
@auth.login_required
def about():
    return render_template("about.html", metrics=METRICS)


@app.route("/api/auth/signup", methods=["POST"])
def api_signup():
    """JSON signup used by the mobile app. Returns a JWT + user profile."""
    data = request.get_json(force=True, silent=True) or {}
    try:
        user = auth.create_user(data.get("name", ""), data.get("email", ""), data.get("password", ""))
    except auth.AuthError as e:
        return jsonify({"error": str(e)}), 400

    token = auth.issue_token(user["_id"])
    return jsonify({"token": token, "user": auth.public_user(user)})


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    """JSON login used by the mobile app. Returns a JWT + user profile."""
    data = request.get_json(force=True, silent=True) or {}
    try:
        user = auth.authenticate_user(data.get("email", ""), data.get("password", ""))
    except auth.AuthError as e:
        return jsonify({"error": str(e)}), 401

    token = auth.issue_token(user["_id"])
    return jsonify({"token": token, "user": auth.public_user(user)})


@app.route("/api/auth/me")
@auth.api_login_required
def api_me():
    """Lets the mobile app verify a stored token is still valid and fetch
    the current user's profile (e.g. after reopening the app)."""
    user = auth.find_user_by_id(g.user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"user": auth.public_user(user)})


@app.route("/api/predict", methods=["POST"])
@auth.api_login_required
def api_predict():
    """JSON API endpoint — crop prediction only, no history logging.
    Kept for backward compatibility; the mobile app uses /api/advisory below."""
    data = request.get_json(force=True)
    try:
        vector, raw = build_feature_vector({
            "nitrogen": data["nitrogen"], "phosphorus": data["phosphorus"], "potassium": data["potassium"],
            "temperature": data["temperature"], "humidity": data["humidity"], "ph": data["ph"],
            "rainfall": data["rainfall"],
        })
    except (KeyError, ValueError) as e:
        return jsonify({"error": f"invalid or missing input: {e}"}), 400

    top_crops = predict_crop(vector)
    return jsonify({"top_crops": top_crops, "model": METRICS["final_model_name"]})


@app.route("/api/advisory", methods=["POST"])
@auth.api_login_required
def api_advisory():
    """Full JSON advisory API used by the React Native app — same logic as
    the /advisory web form (including writing to advisory_history.json),
    just returning JSON instead of rendering an HTML page."""
    data = request.get_json(force=True, silent=True) or {}
    try:
        record, info, tips = run_advisory(data)
    except (KeyError, ValueError) as e:
        return jsonify({"error": f"invalid or missing input: {e}"}), 400

    return jsonify({
        "top_crops": record["top_crops"],
        "recommended_crop": record["recommended_crop"],
        "info": info,
        "tips": tips,
        "inputs": record["inputs"],
    })


@app.route("/api/leaf-disease", methods=["POST"])
@auth.api_login_required
def api_leaf_disease():
    """JSON leaf disease API used by the React Native app. Expects a
    multipart/form-data POST with a 'leaf_image' file field, same as the
    web upload form."""
    if LEAF_MODEL is None:
        return jsonify({"error": "The leaf disease model isn't available on this server."}), 503

    try:
        result = run_leaf_disease(request.files.get("leaf_image"))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({
        "top_predictions": result["top_predictions"],
        "info": result["info"],
    })


@app.route("/api/history")
@auth.api_login_required
def api_history():
    """Returns the full advisory history as JSON."""
    return jsonify(read_json("advisory_history.json"))


@app.route("/api/model-info")
@auth.api_login_required
def api_model_info():
    """Returns both models' metrics for the app's 'About Model' screen."""
    leaf_summary = None
    if LEAF_METRICS is not None:
        leaf_summary = {
            "model_name": LEAF_METRICS.get("model_name"),
            "test_accuracy": LEAF_METRICS.get("test_accuracy"),
            "n_classes": LEAF_METRICS.get("n_classes"),
            "classes": LEAF_METRICS.get("classes"),
        }
    return jsonify({
        "crop_model": METRICS,
        "leaf_model": leaf_summary,
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5050)
