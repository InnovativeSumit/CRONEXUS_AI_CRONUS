"""Builds app/database/leaf_disease_info.json — hand-curated agronomic
knowledge (readable disease name, symptoms, and treatment/curing steps) for
each of the 10 classes the leaf disease CNN was trained on."""
import json, os

BASE = os.path.dirname(os.path.abspath(__file__))

DISEASE_INFO = {
    "Apple___Apple_scab": {
        "crop": "Apple",
        "disease_name": "Apple Scab",
        "is_healthy": False,
        "symptoms": "Olive-green to black velvety spots on leaves and fruit, leaves may curl, pucker, or drop early.",
        "treatment": "Remove and destroy fallen infected leaves to cut the fungus's overwintering source, prune for better air circulation, and apply a fungicide (e.g. captan or myclobutanil) starting at green-tip stage in spring.",
    },
    "Apple___healthy": {
        "crop": "Apple",
        "disease_name": "Healthy",
        "is_healthy": True,
        "symptoms": "No visible spots, discoloration, or lesions — leaf shows normal uniform green color.",
        "treatment": "No treatment needed. Keep up routine watering, balanced fertilization, and periodic pest scouting.",
    },
    "Corn_(maize)___Common_rust_": {
        "crop": "Maize (Corn)",
        "disease_name": "Common Rust",
        "is_healthy": False,
        "symptoms": "Small, reddish-brown, powdery pustules scattered on both leaf surfaces, turning darker as the plant matures.",
        "treatment": "Plant rust-resistant maize hybrids, rotate crops, and apply a foliar fungicide (e.g. azoxystrobin or propiconazole) if rust appears before tasseling.",
    },
    "Corn_(maize)___healthy": {
        "crop": "Maize (Corn)",
        "disease_name": "Healthy",
        "is_healthy": True,
        "symptoms": "No visible spots, discoloration, or lesions — leaf shows normal uniform green color.",
        "treatment": "No treatment needed. Continue balanced NPK fertilization and monitor for pests.",
    },
    "Grape___Black_rot": {
        "crop": "Grapes",
        "disease_name": "Black Rot",
        "is_healthy": False,
        "symptoms": "Small tan spots with dark borders on leaves, and shriveled, mummified black berries on the fruit clusters.",
        "treatment": "Remove mummified berries and infected leaves each season, improve canopy airflow through pruning, and apply a fungicide (e.g. mancozeb or myclobutanil) from bud break through veraison.",
    },
    "Grape___healthy": {
        "crop": "Grapes",
        "disease_name": "Healthy",
        "is_healthy": True,
        "symptoms": "No visible spots, discoloration, or lesions — leaf shows normal uniform green color.",
        "treatment": "No treatment needed. Maintain regular canopy management and irrigation.",
    },
    "Potato___Early_blight": {
        "crop": "Potato",
        "disease_name": "Early Blight",
        "is_healthy": False,
        "symptoms": "Dark brown spots with concentric target-like rings, usually starting on older/lower leaves first.",
        "treatment": "Remove and destroy infected leaves, avoid overhead watering, rotate crops away from potato/tomato beds, and apply a fungicide (e.g. chlorothalonil or mancozeb) at first sign of spots.",
    },
    "Potato___healthy": {
        "crop": "Potato",
        "disease_name": "Healthy",
        "is_healthy": True,
        "symptoms": "No visible spots, discoloration, or lesions — leaf shows normal uniform green color.",
        "treatment": "No treatment needed. Keep consistent watering and hill soil around the base of the plant.",
    },
    "Tomato___Late_blight": {
        "crop": "Tomato",
        "disease_name": "Late Blight",
        "is_healthy": False,
        "symptoms": "Large, irregular, water-soaked greenish-black patches on leaves that spread rapidly in cool, wet weather, often with white fungal growth on the underside.",
        "treatment": "Remove and destroy infected plants immediately to stop rapid spread, avoid overhead irrigation, ensure good spacing for airflow, and apply a fungicide (e.g. chlorothalonil or copper-based) preventively in humid weather.",
    },
    "Tomato___healthy": {
        "crop": "Tomato",
        "disease_name": "Healthy",
        "is_healthy": True,
        "symptoms": "No visible spots, discoloration, or lesions — leaf shows normal uniform green color.",
        "treatment": "No treatment needed. Maintain steady watering and staking/support for the plant.",
    },
}

with open(f"{BASE}/app/database/leaf_disease_info.json", "w") as f:
    json.dump(DISEASE_INFO, f, indent=2)

print("leaf_disease_info.json built for", len(DISEASE_INFO), "classes")
