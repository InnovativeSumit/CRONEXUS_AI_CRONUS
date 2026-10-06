"""Builds app/database/crop_info.json — a hand-curated agronomic knowledge
base (season, fertilizer guidance, irrigation notes, common leaf diseases)
for each of the 22 crop classes in the dataset. Combined at runtime with the
data-driven crop_profile.json (per-crop average N/P/K/temperature/humidity/
ph/rainfall computed from the training data) to build the final advisory.
"""
import json, os

BASE = os.path.dirname(os.path.abspath(__file__))

CROP_INFO = {
    "rice":        {"season": "Kharif (Jun-Nov)", "fertilizer": "Urea (N-rich) split in 3 doses + DAP at sowing", "diseases": ["Blast", "Bacterial Leaf Blight", "Sheath Blight"]},
    "maize":       {"season": "Kharif / Rabi", "fertilizer": "NPK 120:60:40 kg/ha, top-dress N at knee-high stage", "diseases": ["Leaf Blight", "Common Rust", "Downy Mildew"]},
    "chickpea":    {"season": "Rabi (Oct-Mar)", "fertilizer": "Low N (legume fixes its own), phosphorus-rich basal dose", "diseases": ["Ascochyta Blight", "Fusarium Wilt", "Collar Rot"]},
    "kidneybeans": {"season": "Rabi / Summer", "fertilizer": "Light N starter dose + phosphorus for root/nodule growth", "diseases": ["Anthracnose", "Bean Rust", "Angular Leaf Spot"]},
    "pigeonpeas":  {"season": "Kharif (Jun-Dec)", "fertilizer": "Minimal N, basal phosphorus + potassium", "diseases": ["Fusarium Wilt", "Sterility Mosaic", "Phytophthora Blight"]},
    "mothbeans":   {"season": "Kharif (drought-tolerant)", "fertilizer": "Very low input, light phosphorus at sowing", "diseases": ["Yellow Mosaic Virus", "Powdery Mildew"]},
    "mungbean":    {"season": "Kharif / Summer", "fertilizer": "Starter N (20 kg/ha) + phosphorus, avoid excess N", "diseases": ["Yellow Mosaic Virus", "Cercospora Leaf Spot", "Powdery Mildew"]},
    "blackgram":   {"season": "Kharif / Rabi", "fertilizer": "Low N, phosphorus + potassium basal application", "diseases": ["Yellow Mosaic Virus", "Leaf Crinkle", "Powdery Mildew"]},
    "lentil":      {"season": "Rabi (Oct-Mar)", "fertilizer": "Minimal N, phosphorus-rich basal dose", "diseases": ["Rust", "Wilt", "Ascochyta Blight"]},
    "pomegranate": {"season": "Year-round (irrigated)", "fertilizer": "Balanced NPK + micronutrients (Zn, Fe) in split doses", "diseases": ["Bacterial Blight", "Fruit Spot", "Wilt"]},
    "banana":      {"season": "Year-round (irrigated)", "fertilizer": "Heavy N-K feeder, monthly split doses through drip", "diseases": ["Panama Wilt", "Sigatoka Leaf Spot", "Bunchy Top Virus"]},
    "mango":       {"season": "Perennial (flowering Dec-Feb)", "fertilizer": "Organic manure + NPK after harvest, avoid excess N before flowering", "diseases": ["Anthracnose", "Powdery Mildew", "Bacterial Canker"]},
    "grapes":      {"season": "Perennial (pruned twice/yr)", "fertilizer": "Balanced NPK with potassium boost during berry development", "diseases": ["Downy Mildew", "Powdery Mildew", "Anthracnose"]},
    "watermelon":  {"season": "Summer / Zaid", "fertilizer": "Moderate N early, potassium-heavy during fruiting", "diseases": ["Fusarium Wilt", "Anthracnose", "Downy Mildew"]},
    "muskmelon":   {"season": "Summer / Zaid", "fertilizer": "Moderate NPK, potassium boost at fruit set", "diseases": ["Powdery Mildew", "Downy Mildew", "Fusarium Wilt"]},
    "apple":       {"season": "Temperate, perennial", "fertilizer": "Balanced NPK in early spring + organic mulch", "diseases": ["Apple Scab", "Powdery Mildew", "Fire Blight"]},
    "orange":      {"season": "Perennial (citrus)", "fertilizer": "Balanced NPK with micronutrients, split across seasons", "diseases": ["Citrus Canker", "Greening (HLB)", "Leaf Miner damage"]},
    "papaya":      {"season": "Year-round (irrigated)", "fertilizer": "Monthly light NPK doses, high organic matter", "diseases": ["Ring Spot Virus", "Powdery Mildew", "Anthracnose"]},
    "coconut":     {"season": "Perennial", "fertilizer": "NPK + Mg twice yearly, organic manure basal", "diseases": ["Bud Rot", "Leaf Rot", "Root Wilt"]},
    "cotton":      {"season": "Kharif (Apr-Oct)", "fertilizer": "N-heavy, split in 3-4 doses with potassium at boll stage", "diseases": ["Bacterial Blight", "Leaf Curl Virus", "Grey Mildew"]},
    "jute":        {"season": "Kharif (Mar-Jul)", "fertilizer": "Moderate N-P-K, top-dress N 3-4 weeks after sowing", "diseases": ["Stem Rot", "Anthracnose", "Black Band"]},
    "coffee":      {"season": "Perennial (shade-grown)", "fertilizer": "Balanced NPK 3 times/year + organic mulch", "diseases": ["Coffee Leaf Rust", "Berry Disease", "Root Rot"]},
}

IRRIGATION_BANDS = [
    (0, 60,   "Low water need — irrigate every 10-14 days; prioritize drip/sprinkler to conserve water."),
    (60, 120, "Moderate water need — irrigate every 6-9 days depending on soil moisture."),
    (120, 200,"High water need — irrigate every 3-5 days, ensure good drainage to avoid waterlogging."),
    (200, 10_000, "Very high water need — frequent irrigation (every 1-3 days) or naturally high-rainfall zone; watch for waterlogging."),
]

def irrigation_note(avg_rainfall):
    for lo, hi, note in IRRIGATION_BANDS:
        if lo <= avg_rainfall < hi:
            return note
    return IRRIGATION_BANDS[-1][2]

with open(f"{BASE}/app/database/crop_profile.json") as f:
    profile = json.load(f)

db = {}
for crop, info in CROP_INFO.items():
    p = profile.get(crop, {})
    db[crop] = {
        "season": info["season"],
        "fertilizer_guidance": info["fertilizer"],
        "irrigation_guidance": irrigation_note(p.get("rainfall", 100)),
        "common_diseases": info["diseases"],
        "ideal_conditions": p,
    }

os.makedirs(f"{BASE}/app/database", exist_ok=True)
with open(f"{BASE}/app/database/crop_info.json", "w") as f:
    json.dump(db, f, indent=2)

# Empty seed files for the app's "JSON database"
if not os.path.exists(f"{BASE}/app/database/advisory_history.json"):
    with open(f"{BASE}/app/database/advisory_history.json", "w") as f:
        json.dump([], f)

if not os.path.exists(f"{BASE}/app/database/users.json"):
    with open(f"{BASE}/app/database/users.json", "w") as f:
        json.dump([], f)

print("crop_info.json built for", len(db), "crops")
