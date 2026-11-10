<div align="center">

<img src="frontend/public/logo.png" width="120" alt="CropNexus logo" />

# 🌾 CropNexus

### AI-Powered Farmer Advisory: crops, plant health, weather, water and farm planning

**React + TypeScript + Tailwind CSS (Vite)** · **Node.js + Express + MongoDB** · **Python + FastAPI + TensorFlow / scikit-learn**

`CropNexus © 2026`

</div>

CropNexus helps a farmer decide what to grow, check a sick leaf, check the weather, plan irrigation, keep a task calendar and find government schemes. Accounts, sessions, statistics, history and calendar tasks live in MongoDB; the ML models run in a separate FastAPI service.

## 📋 Table of Contents
[Features](#-features) · [Architecture](#-architecture) · [Quick start](#-quick-start) · [Environment & API keys](#-environment-variables--api-keys) · [Feature guide](#-feature-guide) · [Data you can edit](#-data-you-can-edit) · [Authentication & security](#-authentication--security) · [API reference](#-api-reference) · [Testing](#-testing) · [Soil model training](#-soil-health-model) · [Retraining](#-retraining-the-models) · [Deployment](#-deployment) · [Limitations](#-honest-limitations) · [Troubleshooting](#-troubleshooting)

## ✨ Features

| Feature | Needs login | Powered by |
|---|---|---|
| **AI Crop Prediction** – top-3 crops from soil N-P-K, pH and weather, with fertilizer/irrigation guidance | ✔ | Trained Random Forest (30 crops) |
| **Plant Disease Detector** – disease from a leaf photo, with symptoms, treatment and low-confidence warnings | ✔ | Trained TensorFlow CNN (10 classes) |
| **Live Weather** – current conditions, 7-day forecast, rule-based farm alerts | – | Open-Meteo |
| **Crop Calendar** – priority 1/2/3 tasks, calendar + list views, filters, overdue, edit/reschedule/delete | ✔ | Your tasks in MongoDB |
| **Agricultural Products** – 30 hand-checked real products with links to the seller | – | `server/data/products.json` |
| **Soil Health** – soil-type guess from a photo (experimental) and rule-based rating of soil-test values | ✔ | TensorFlow CNN + rules |
| **Water Management** – 7-day irrigation plan (FAO-56), save irrigation days to the calendar | – | Open-Meteo ET₀ + FAO-56 formulas |
| **Farming Resources** – government schemes with official links, agriculture news | – | `schemes.json` + RSS feeds |
| **About / Contact** – transparent about models vs APIs vs rules; validated contact form with spam protection | – | – |

Plus: **6-step sign-up (name → age with an age-range guide → email → mobile → password → confirm; no OTP or verification step)**, login/logout with a 3-minute cooldown, password reset by email, feedback with 1–5 stars, live community statistics (registered users and users online now — shown **only** on the public landing page and the signed-in Home page), profile avatars, 9 interface languages (see limitations), light/dark theme, reduced-motion support.

The "AI illness prediction" idea in the requirements is the **Plant Disease Detector** that already existed; it was improved (file-type/size checks, low-confidence warning, keyboard-accessible upload) rather than duplicated.

## 🏗️ Architecture

```
 Browser (React + TS, Vite)  ──/api──▶  Express + MongoDB  ──HTTP──▶  FastAPI (Python)
   :5173 (dev) / served by Express        :5050                         :8000
                                          auth · sessions · calendar    crop RandomForest · leaf CNN · soil CNN
                                          weather/RSS proxies       soil-test rules
                                          MongoDB localhost:27017
                                                │
                                                └── Open-Meteo · RSS feeds (server-side, keys never reach the browser)
```

| Layer | Folder | Responsibility |
|---|---|---|
| Frontend | `frontend/` | React 19 + TypeScript + Vite + Tailwind v4. Pages, i18n, theme, accessibility |
| Backend | `server/` | Express + TypeScript + MongoDB: auth, authorization, caching, third-party API proxies, ML gateway |
| AI/ML | `ml_service/` | FastAPI: loads trained models and serves predictions |

The browser never talks to FastAPI or to third-party APIs directly. Express validates input, enforces authorization (calendar and soil are per-user; every query is scoped to the signed-in user), caches and times out upstream calls, and stores results.

## 🚀 Quick start

Requirements: Node 18.17+ (22 recommended), Python 3.10+, MongoDB running on `localhost:27017`.

```bash
# 1. Environment file
cp .env.example .env            # Windows: copy .env.example .env
#    then set JWT_SECRET to a long random value (see the comment inside)

# 2. Python deps (AI service)
pip install -r ml_service/requirements.txt     # pinned and tested on Python 3.13; on another Python version install the same packages without the pins

# 3. Node deps (root helper + server + frontend)
npm run setup

# 4. Run everything (AI :8000, API :5050, web :5173)
npm run dev
```

Open **http://localhost:5173**. Database `CROPNEXUS`, users collection `USERS` (unchanged from earlier versions).

**Production-style single server:** `npm run build` then `npm start`. Express serves the built React app from `frontend/dist` at **http://localhost:5050** and FastAPI runs on :8000.

> TensorFlow loads slowly (10–40 s). Crop advisory works as soon as FastAPI is up. If TensorFlow is missing, only the two photo features are unavailable and the app says so.

## 🔐 Environment variables & API keys

Everything is documented in [`.env.example`](.env.example). No real secret is shipped in this ZIP, and `.env` must never be committed.

| What | Variable(s) | Needed for | Without it |
|---|---|---|---|
| JWT secret | `JWT_SECRET` | login sessions | **required** – set a long random value |
| MongoDB | `MONGO_URI`, `MONGO_USERS_COLLECTION` | everything | defaults to `mongodb://localhost:27017/CROPNEXUS`, `USERS` |
| **Email (SMTP)** | `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` | password-reset links, contact forwarding | links/messages are printed in the server terminal (dev) and never returned by the API; production refuses to "send" |
| Contact page | `CONTACT_DEVELOPER_NAME`, `CONTACT_DEVELOPER_PHONE`, `CONTACT_DEVELOPER_EMAIL`, `CONTACT_TO_EMAIL`, `CONTACT_RATE_LIMIT` | public details + inbox | nothing is shown that you did not provide |
| Rate limits | `RATE_LIMIT_MAX`, `SEND_RATE_LIMIT_MAX`, `PUBLIC_RATE_LIMIT_MAX` | abuse protection | sensible defaults |
| Weather | – (Open-Meteo needs no key) | Weather, Water | – |

MongoDB collections in `CROPNEXUS`: `USERS`, `AUTH_EVENTS`, `HISTORY`, `FEEDBACK`, `TASKS` (calendar), `CONTACT_MESSAGES`.

## 🧭 Feature guide

- **Live Weather / Water** – Open-Meteo (keyless, CC BY 4.0). Farm alerts (heat, frost, rain, wind, irrigation) are threshold rules and are labelled "estimates". The Water plan applies the FAO-56 method (ET₀ × Kc − effective rain against the soil's available water) for 14 crops × 6 soil types × 3 irrigation methods; assumptions are listed with every plan, and irrigation days can be saved to the Crop Calendar.
- **Crop Calendar** – tasks belong to the signed-in user (server-side check on every call), priorities 1 (high, red) / 2 (amber) / 3 (green) are also written out as text, filters for date/status/priority, overdue detection, create/edit/complete/reschedule/delete.
- **Products** – dynamic from `products.json`; search, category filter, details dialog, safe external links (`rel="noopener noreferrer"`), fallback image when a photo is missing or fails. Prices are the seller's price on the date checked and can change.
- **Soil Health** – see [Soil health model](#-soil-health-model). Two independent inputs: a photo (experimental model) and typed soil-test values (rule-based ranges similar to the Soil Health Card). Nutrients, pH and salinity are **never** inferred from a photo.
- **Resources** – schemes with eligibility/benefits/how-to-apply and a link to the official page, plus news from RSS feeds. Headlines belong to the publishers; CropNexus does not verify them.
- **About** – a table of which feature is a trained model, an external API, curated data or rules, with live accuracy figures read from the model service.

## ✏️ Data you can edit

| File | Contents | How to update |
|---|---|---|
| `server/data/products.json` | 30 products (name, category, description, seller, price, `purchaseUrl`, `verifiedAt`…) | Edit the JSON; the server reloads it automatically. Invalid records are skipped and logged, never crash the API. Verify each link and price on the seller's page and set `verifiedAt` |
| `server/data/schemes.json` | 18 schemes with `officialUrl`, `status` (`active`/`unconfirmed`/`closed`), `lastVerified` | Edit, and confirm on the official site. 15 are central schemes, 3 state schemes – the state list is **not** complete |
| `server/data/news_sources.json` | RSS feeds | Add verified feed URLs |
| `docs/DATA_SOURCES.md` | Research notes on every external source, licences, quirks | – |

## 🎨 Interface notes (v9, updated in v10)

The visual layer was restyled in the spirit of the animated React component kits (such as [Skiper UI](https://skiper-ui.com)): floating glass navbar, sliding active-page pill, icon tiles that fill on hover, glow-follow cards, a feature ticker, count-up numbers and scroll reveals. **No Skiper UI source code is included** — the site is a Next.js/shadcn kit with free and paid parts that were not reachable while building, so every component here is original code in `frontend/src/components/` (`motion.tsx`, `icons.tsx`, `Navbar.tsx`, `Footer.tsx`, `FeatureSections.tsx`, `LiveStats.tsx`). If you later license a Skiper component, copy it in and keep its attribution.

- **Libraries added:** [`motion`](https://motion.dev) (animation, loaded through `LazyMotion`), [`lucide-react`](https://lucide.dev) (icons — they replace the old emoji), `@fontsource-variable/geist` and `@fontsource-variable/bricolage-grotesque` (fonts are bundled, so no Google Fonts request).
- **Fonts:** Bricolage Grotesque for headings, Geist for text.
- **Navbar:** floating glass bar, sliding active pill, icon-tile Features menu with staggered items, animated sun/moon theme toggle. **v10:** on desktop the bar scrolls away with the page; on phones it is attached flush to the top edge and stays there, with the menu button at the top-right (also after login).
- **Footer:** dark canopy-green footer with icon links, back-to-top button and an outlined wordmark.
- **Motion rules:** nothing flips, rotates in 3-D or tilts; reveals and counters run once; everything is disabled for visitors who prefer reduced motion (`MotionConfig reducedMotion="user"` + CSS).
- Live statistics are still shown **only** on the landing page and the signed-in Home page.

## 🎨 Layout rules (v8, still in force)

- **Features menu** – opens on mouse hover, on *keyboard focus* (Tab to "Features", then Tab/Arrow keys through the items, Esc closes and returns focus), and by click/tap (phones, tablets, touch laptops). The panel is flush with the button so the pointer never loses it, and it is clamped inside the viewport.
- **Feature sections** – each feature on the landing page is a split layout: the picture fills one half of the container and the detailed description the other, alternating left/right on wide screens and stacking (picture first) on phones. There are **no flip animations, 3-D rotations, tilt or hover-triggered movement** anywhere; the hero is a flat illustration.
- **Live statistics** – *registered users* and *online now* appear **only** on the public landing page and the signed-in Home page (`frontend/src/components/LiveStats.tsx`). The live connection (`/api/stats/stream`) is opened only while one of those two pages is mounted and closed when you leave; the sign-up age step shows a plain age-range guide with no counts.
- **Quality of life** – skip-to-content link, visible focus rings, skeleton loading states, a short page fade-in, consistent page headers, and `prefers-reduced-motion` support.
- `server/test/ui_check.py` is the browser check used for these items (Playwright for Python; start `server/test/e2e-server.ts` on port 5050 and `npm run dev --prefix frontend` first).

## 🛡️ Authentication & security

- **Sign-up:** name, age (0–120), email (any valid address; Gmail suggested), mobile (validated per country with `libphonenumber-js`, stored as E.164), password (≥ 8 chars with a letter and a number) and confirmation. **There is no OTP / email / SMS verification** – an account is created as soon as the form passes validation, so addresses and phone numbers are *not* proven to belong to the user. Duplicate emails (and phone numbers) are rejected.
- **Passwords:** hashed with **bcrypt (cost 12)**; never returned by any API.
- **Sessions:** signed JWT in an **HttpOnly, SameSite=Strict (Secure in production) cookie**, not readable by JavaScript; state-changing calls also need `X-Requested-With` (CSRF defence). Each token carries the user's `tokenVersion`; **logout and password reset increment it**, so old sessions stop working immediately. Auth middleware protects every private route.
- **Cooldown & lock-out:** 180 s login cooldown after logout (server-enforced); 5 wrong passwords lock the account for 15 minutes. Login timing does not reveal which emails exist.
- **Reset links:** 32 random bytes, only the SHA-256 hash is stored, 15-minute expiry, single use, sent by email only.
- **Everything else:** `helmet`, request-size limits, zod validation on every input, uploads limited to 12 MB JPG/PNG/WEBP, per-IP rate limits (auth, public data endpoints, contact form with a honeypot field), `Cache-Control: no-store` on the API, third-party API keys only in the server `.env`.

## 📡 API reference

Private routes need the `cn_session` cookie (set by login/signup; the web app sends it automatically).

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/auth/config` | – | email delivery mode, cooldown (no secrets) |
| `POST /api/auth/signup` | – | `{name,age,email,country,phone,password,confirmPassword}` → `{user}` + cookie |
| `POST /api/auth/login` · `/logout` · `GET /api/auth/me` | – / ✔ | session handling |
| `POST /api/auth/forgot-password` · `/reset-password` | – | reset flow |
| `GET /api/stats` · `/api/stats/stream` | – | live statistics (incl. age groups) |
| `PATCH /api/profile` · `/api/feedback…` | ✔ | profile, reviews |
| `POST /api/advisory` · `POST /api/leaf-disease` · `GET/DELETE /api/history` | ✔ | ML features + per-user history |
| `GET /api/weather/search?q=` · `GET /api/weather?lat=&lon=` | – | place search, forecast + insights |
| `GET /api/water/options` · `POST /api/water/plan` | – | irrigation plan |
| `GET/POST/PATCH/DELETE /api/calendar` | ✔ | tasks (`status`, `priority`, `from`, `to` filters) |
| `GET /api/products` · `/api/products/:id` | – | catalogue |
| `GET /api/resources/schemes` · `/news` | – | schemes and news |
| `GET /api/contact/info` · `POST /api/contact` | – | public contact details · message |
| `GET /api/soil/status` · `POST /api/soil/analyze` | ✔ | multipart `soil_image` and/or `nitrogen, phosphorus, potassium, organic_carbon, ph, ec` |
| `GET /api/model-summary` · `/api/model-info` · `/api/health` | – / ✔ / – | model figures, service health |

FastAPI (docs at <http://localhost:8000/docs>): `/health`, `/crops`, `/predict/crop`, `/predict/leaf`, `/predict/soil`, `/soil/status`, `/soil/assess`, `/model-info`.

## 🧪 Testing

```bash
npm test                       # Express API tests (44): production-config checks, health/headers, cookie modes, auth, signup without OTP, lockout, cooldown, reset, calendar authz, weather, water FAO-56, products, resources, contact, soil
cd ml_service && pip install -r requirements-dev.txt && pytest -q   # FastAPI tests (3): 30 crops, provenance flags, leaf + soil prediction, soil-test rules, key required in production
npm run typecheck              # TypeScript for server + frontend
npm run build                  # production build of the frontend + server
```

The Express tests run against a tiny in-memory stand-in for the MongoDB driver and a **fake HTTP provider** for Open-Meteo / RSS, so they need no database or network. **No test in this ZIP calls the real Open-Meteo, RSS feeds or an SMTP server** – see limitations.

## 📸 Screenshots

Taken in a development sandbox without the AI service, so Soil shows its honest "unavailable" state and the live numbers are tiny (only the accounts created during the test).

| | |
|---|---|
| **Landing** ![Landing](screenshots/landing.png) | **Split-layout feature section** ![Feature](screenshots/feature-section.png) |
| **Features menu (hover / keyboard focus)** ![Menu](screenshots/features-menu.png) | **Sign-up step 2 (age-range guide)** ![Step 2](screenshots/signup-step2.png) |
| **Home (signed in)** ![Home](screenshots/home.png) | **Dark mode** ![Dark](screenshots/dark-mode.png) |
| **Crop Calendar** ![Calendar](screenshots/calendar.png) | |
| **Products** ![Products](screenshots/products.png) | **Soil Health** ![Soil](screenshots/soil.png) |
| **Water Management** ![Water](screenshots/water.png) | **Plant disease** ![Leaf](screenshots/leaf-disease.png) |
| **Mobile landing** ![Mobile](screenshots/mobile-landing.png) | **Mobile Features menu (tap)** ![Mobile menu](screenshots/mobile-menu.png) |
| **Mobile, signed in (menu button top-right)** ![Mobile signed in](screenshots/mobile-loggedin.png) | |

## 🪱 Soil health model

Two parts, kept separate on purpose:

1. **Soil-test ratings (rule-based, no model).** Values you type from a lab report / Soil Health Card / test kit (N, P, K in kg/ha, organic carbon %, pH, EC dS/m) are compared with general rating ranges. It is guidance, not a lab result.
2. **Soil photo → broad soil type (TensorFlow CNN, experimental).** Trained by `train_soil_model.py` on the public Phantom-fs soil-photo dataset (7 Indian soil types, 1,189 photos, **CC BY-NC 4.0 – non-commercial / research use only**, photos were scraped from the web by the dataset authors). Exact duplicates and near-duplicates are removed before the train/validation/test split so test images do not leak from training.

**Measured result of the shipped model (`models/soil/metrics.json`):** test accuracy **30.8 %** and macro-F1 **0.23** on 159 held-out photos (7 classes; guessing would be ≈ 14 % and always answering "Arid" ≈ 25 %). It **never predicts three of the seven classes** (Alluvial, Black, Laterite), so it is a weak, rough hint at best, and the Soil page displays these numbers next to every prediction. It cannot see nutrients, pH, salinity or moisture. To do better you need your own labelled field photos.

```bash
python download_soil_dataset.py     # clones the dataset into data/soil_images/ (needs git, ~780 MB download)
python train_soil_model.py          # writes app/model/soil/ and models/soil/metrics.json
```

The dataset itself is **not** in this ZIP. If `app/model/soil/` is missing, the Soil page says the photo model is unavailable and still serves the soil-test ratings.

## 🔁 Retraining the models

```bash
python generate_synthetic_data.py            # reproducible (seed 42) → data/synthetic/
python train_pipeline.py                     # compares 9 models, tunes the best, writes models/ + app/model/ + metrics.json
python build_crop_knowledge_base.py          # crop_info.json for all 30 crops
python train_leaf_disease_model.py && python finalize_leaf_disease_model.py && python build_leaf_disease_knowledge_base.py
cp models/leaf_disease/leaf_disease_model.weights.h5 models/leaf_disease/class_names.json app/model/leaf_disease/
```

The leaf training images (PlantVillage, ≈ 42 MB) are not in this ZIP; the trained weights are. To retrain, put the photos in `data/leaf_disease/<class_name>/*.jpg` (class names in `app/model/leaf_disease/class_names.json`). The CNNs are loaded weights-only (architectures in `app/leaf_disease_architecture.py` and `app/soil_architecture.py`) to avoid Keras-version deserialization errors.

## 🚢 Deployment

**Full step-by-step guide (free hosting): [DEPLOYMENT.md](DEPLOYMENT.md)** – website on Vercel (or Netlify), API on Render, MongoDB Atlas, AI service on Google Cloud Run.

What ships for production:

| File | Purpose |
|---|---|
| `Dockerfile` (project root) | AI service image (FastAPI + TensorFlow-CPU + models); refuses to start without `ML_SERVICE_KEY` |
| `server/Dockerfile` | API image (Node 22, non-root, health check) |
| `render.yaml` | Render Blueprint for the API |
| `frontend/vercel.json`, `frontend/netlify.toml` | SPA fallback, `/api` proxy to the API, security headers, caching |
| `.github/workflows/ci.yml` | Type-check, API tests, frontend build, AI-service tests on every push |
| `.github/workflows/keepalive.yml` | Optional ping that keeps the free API awake |
| `.env.example`, `frontend/.env.example` | Every setting, documented |

Production behaviour: with `NODE_ENV=production` the API validates its configuration at start-up and exits with a clear list of problems (weak `JWT_SECRET`, localhost database, non-https origin, missing AI-service URL); cookies are `HttpOnly` + `Secure`; `/healthz` (liveness) and `/api/health` (database + AI service); one log line per request without personal data; graceful shutdown; CSP/HSTS headers.

## 🧬 Data & model evaluation (read this before trusting a number)

**Crop model — 30 crops, two data sources that are never mixed up:**

| Source | Crops | Rows | Origin |
|---|---|---|---|
| `real` | 22 (rice, maize, chickpea, kidney beans, pigeon peas, moth beans, mung bean, black gram, lentil, pomegranate, banana, mango, grapes, watermelon, muskmelon, apple, orange, papaya, coconut, cotton, jute, coffee) | 2,200 | Public Kaggle *Crop Recommendation* CSV (`data/raw/`) — not measured by this project |
| `synthetic` | 8 (wheat, sorghum, millet, soybean, groundnut, sugarcane, potato, tomato) | 800 | `generate_synthetic_data.py`: sampled (seed 42) from **approximate agronomic ranges written by the project author** → `data/synthetic/synthetic_crops.csv`. **Not field data**; needs agronomist review before real farming use |

Measured on the held-out 20 % test split (600 rows, stratified, seed 42) by `train_pipeline.py` — Random Forest (tuned), saved in `models/metrics.json`:

| | Test rows | Accuracy |
|---|---|---|
| **Real-data crops (the meaningful number)** | 440 | **99.32 %** |
| Synthetic crops | 160 | 100 % — *only shows they are separable by construction; says nothing about real fields* |
| Overall (mixed) | 600 | 99.5 % |

The 99 % on real rows reflects a clean, well-separated public dataset, not guaranteed field accuracy. The API marks any recommendation for a synthetic-backed crop with `data_source: "synthetic"` and a caution note, and the UI shows it.

**Leaf-disease model:** a CNN trained on **real PlantVillage photographs** (2,402 images, 10 classes; images not bundled), 91.96 % test accuracy (`models/leaf_disease/metrics.json`). No synthetic images are used. Photos are lab-style PlantVillage images, so accuracy on field photos will be lower.

## ⚠️ Honest limitations

- **No live testing of external services.** Open-Meteo, the RSS feeds and SMTP were *not* reachable from the build sandbox. Their integrations are covered by tests with fake providers and follow the documented response formats; **run the app once with internet access and your SMTP settings and check the Weather, Water, Resources and email flows before relying on them.**
- **No identity verification at sign-up.** Email addresses and phone numbers are not verified (by request), so anyone can register with someone else's details.
- **Soil photo model is weak** (30.8 % test accuracy; see above) and the dataset is non-commercial. Soil-test ratings are general ranges, not recommendations for your crop and region.
- The 8 synthetic-data crops in the crop model are demonstrations of the pipeline, not validated recommendations.
- Leaf model covers **10 classes / 5 crops** (Apple, Corn, Grape, Potato, Tomato) from lab-style photos; an unrelated photo still gets a best-guess label (low-confidence warning below 50 %).
- Water plans are FAO-56 estimates from a forecast, not soil-moisture measurements. Weather alerts are simple rules.
- Products and schemes are hand-curated snapshots (checked 17 Oct 2026) and go stale; the state-scheme list is small. Product prices change; scheme eligibility depends on your state and landholding.
- **Languages:** the interface has 9 languages, but the **new feature pages (Weather, Calendar, Products, Soil, Water, Resources, About, Contact), the feature-card descriptions and the sign-up step texts are English-only**; other languages show English there (navigation labels are translated). Translations were written by an AI model and should be reviewed by a native speaker.
- Express tests use an in-memory MongoDB stand-in; run the app against your real MongoDB once to confirm.
- The app is a decision-support tool, not a certified diagnostic or financial tool – confirm important decisions with a local agriculture officer.
- Live statistics and reviews reflect only your own database; on a fresh install they start at zero.
- New v8 section copy (feature descriptions, age-range guide in non-English languages) falls back to English where a translation is missing.

## 🩹 Troubleshooting

| Symptom | Fix |
|---|---|
| Server prints *Could not connect to MongoDB* | Start MongoDB; check `MONGO_URI` (try it in Compass first) |
| *AI service is not reachable* | Start FastAPI (`npm run dev:ml`); wait for TensorFlow to finish loading; check `ML_SERVICE_URL` |
| Login says *wait Ns* | That is the 3-minute post-logout cooldown (change `LOGIN_COOLDOWN_SECONDS`) |
| Port 5050 busy | Change `PORT` in `.env` and start the frontend with `VITE_API_PROXY=http://localhost:<port>` |
| `python` not found on Windows/macOS | Use `py` / `python3`, or edit `dev:ml` in `package.json` |
| scikit-learn *InconsistentVersionWarning* | Harmless; models were trained on 1.8 and load on newer versions |
