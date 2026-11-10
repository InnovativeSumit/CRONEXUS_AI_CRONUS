# CropNexus – Production Deployment Guide (free tiers)

This guide puts CropNexus online using free services:

| Part | What it is | Free host used here | Why |
|---|---|---|---|
| Website (React) | `frontend/` | **Vercel** (Netlify works too – see §6) | Free static hosting + CDN + HTTPS |
| API (Node/Express) | `server/` | **Render** (free web service) | Free Node hosting, no card needed |
| Database | MongoDB | **MongoDB Atlas M0** (free) | Hosted MongoDB |
| AI / ML service | `ml_service/` (FastAPI + TensorFlow) | **Google Cloud Run** (free monthly allowance) | Needs ~0.7 GB RAM – more than most free tiers give |

```
Browser ──► Vercel (website)  ──/api/*──►  Render (Node API) ──► MongoDB Atlas
                                                  │
                                                  └──────────►  Google Cloud Run (ML service)
```

The browser only talks to **one domain** (your Vercel site). Vercel forwards `/api/*` to Render. Because everything looks
like one site to the browser, the login cookie stays `SameSite=Strict` and secure.

> **Names you asked about.** "Runway" looks like **Railway** and "Subway" like **Netlify** – both are covered as
> alternatives below. If you meant other services, the same Dockerfiles/steps work on any host that runs Docker or Node.

---

## 0. Free-tier facts that shaped this guide (checked 2026-11)

These change over time – re-check before relying on them.

* **Hugging Face Spaces – no longer an option.** Docker Spaces now require a paid PRO plan, so they are *not* free.
* **Render free web service**: spins down after 15 minutes without traffic and takes about a minute to wake up; 750 free
  instance hours per calendar month; ephemeral disk; **outbound ports 25, 465 and 587 are blocked** (so Gmail SMTP does not work – see §4.4).
* **Render / Koyeb free RAM is 512 MB** – the AI service peaked at **about 650 MB** in my tests (TensorFlow + 3 models), so it does *not* fit there.
* **Google Cloud Run free tier (per month)**: 180,000 vCPU-seconds, 360,000 GiB-seconds, 2 million requests; scales to zero.
  Usage is tracked against a **billing account** (you will be asked to add a card); you are billed only above the free tier.
* **MongoDB Atlas M0**: 0.5 GB storage, 100 operations/second, 500 connections, one free cluster per project, paused after 30 days with no connections.
* **Railway** (alternative for the AI service): a one-time trial credit, then a small monthly free credit with only 0.5 GB RAM –
  fine for the trial period, not a permanent free home for this model.

**Realistic expectations:** the free setup is great for a college project / demo / small pilot. The first request after
a quiet period is slow (API ≈ 1 min, AI service ≈ 20–40 s) because the services are asleep. For real traffic, move the API and ML service to a paid always-on plan – no code changes needed.

---

## 1. Put the code on GitHub

1. Create a **private** repository on GitHub (e.g. `cropnexus`).
2. In the project folder:
   ```bash
   git init
   git add .
   git commit -m "CropNexus v10"
   git branch -M main
   git remote add origin https://github.com/<you>/cropnexus.git
   git push -u origin main
   ```
3. Check that `.env` is **not** in the repository (`.gitignore` already excludes it). Never commit secrets.

Generate the two secrets you will need (any machine with Node):
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log('ML_SERVICE_KEY=' + require('crypto').randomBytes(24).toString('hex'))"
```
Keep them in a notes app for now; you will paste them into the hosting dashboards.

---

## 2. Database – MongoDB Atlas (free)

1. Sign up at <https://www.mongodb.com/cloud/atlas/register> → **Create** a free **M0** cluster (pick a region near your users, e.g. Mumbai).
2. **Database Access → Add New Database User**: username + a strong password (letters/numbers only avoids URL-encoding problems). Role: *Read and write to any database*.
3. **Network Access → Add IP Address → "Allow access from anywhere" (`0.0.0.0/0`)**. Render and Cloud Run do not have fixed IPs on free plans, so this is required; the database user's password is what protects it.
4. **Connect → Drivers** → copy the connection string and insert the database name before the `?`:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/CROPNEXUS?retryWrites=true&w=majority
   ```
   This is your `MONGO_URI`. (Collections and indexes are created automatically on first start.)
5. Optional: *Backup* tab → enable the free daily snapshot on the cluster if offered.

---

## 3. AI / ML service – Google Cloud Run

The root `Dockerfile` builds the AI service (FastAPI + TensorFlow-CPU + the trained models, ≈1.5 GB image).
It refuses to start without `ML_SERVICE_KEY` and hides `/docs` – so a public URL is still protected.

### 3.1 One-time setup
1. Create a Google Cloud account → <https://console.cloud.google.com> → create a **project** (e.g. `cropnexus`) and **link a billing account** (card required; free-tier usage is not charged; also add a **Budget alert** for e.g. ₹100 under *Billing → Budgets & alerts*).
2. Install the gcloud CLI: <https://cloud.google.com/sdk/docs/install>, then:
   ```bash
   gcloud auth login
   gcloud config set project <YOUR_PROJECT_ID>
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```

### 3.2 Deploy (run from the **project root**, the folder that contains `Dockerfile`)
```bash
gcloud run deploy cropnexus-ml \
  --source . \
  --region asia-south1 \
  --memory 2Gi --cpu 1 --cpu-boost \
  --min-instances 0 --max-instances 1 \
  --timeout 300 --concurrency 4 \
  --allow-unauthenticated \
  --set-env-vars ML_SERVICE_KEY=<PASTE_YOUR_ML_SERVICE_KEY>
```
* Answer **Y** if it offers to create an Artifact Registry repository.
* `--allow-unauthenticated` means anyone can *reach* the URL; every real endpoint still needs the `X-Service-Key` header (401 otherwise).
* `--max-instances 1` caps cost; `--min-instances 0` lets it sleep (free).
* The build takes ~5–10 minutes the first time. Storing the image in Artifact Registry may cost a few cents per month once it exceeds its free storage – check *Billing* after a week.

When it finishes it prints a **Service URL**, e.g. `https://cropnexus-ml-abc123-el.a.run.app`. This is your `ML_SERVICE_URL`.

### 3.3 Check it
```bash
curl https://<service-url>/health
# → {"status":"ok","crop_model":true,"leaf_model":true,"soil_model":true,"tensorflow":true}
curl -i -X POST https://<service-url>/predict/crop      # → 401 (no key) – this is correct
```
The first call after idle takes 20–40 s (TensorFlow loading).

### 3.4 Updating later
Re-run the same `gcloud run deploy …` command (you can omit `--set-env-vars` to keep the existing value).

### Alternative: Railway
1. <https://railway.com> → **New Project → Deploy from GitHub repo** → pick the repo (root `Dockerfile` is detected automatically).
2. **Variables**: `ML_SERVICE_KEY=<key>`. **Settings → Networking → Generate Domain**.
3. Make sure the service has **≥ 1 GB RAM** – the 0.5 GB free plan is too small; the trial credit covers a larger size for a while, after which it needs a paid plan.

---

## 4. API – Render (free web service)

### 4.1 Create the service
**Option A – Blueprint (fastest):** Render dashboard → **New → Blueprint** → select your GitHub repo. It reads `render.yaml`
and creates `cropnexus-api`; you are asked for the values marked "sync: false" (see 4.2).

**Option B – manual:** **New → Web Service** → your repo, then set:

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `node dist/index.js` |
| Health Check Path | `/healthz` |
| Instance type | Free |

### 4.2 Environment variables

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `JWT_SECRET` | the 96-character secret you generated (Blueprint can generate one) |
| `MONGO_URI` | the Atlas string from §2 |
| `CLIENT_ORIGIN` | your website, **no trailing slash** – fill in after §5, e.g. `https://cropnexus.vercel.app` |
| `ML_SERVICE_URL` | Cloud Run URL from §3 (no trailing slash) |
| `ML_SERVICE_KEY` | the same key you gave Cloud Run |
| `TRUST_PROXY` | `2` (Vercel → Render). Use `1` if the browser calls Render directly |
| `COOKIE_SAMESITE` | `strict` (default) |
| `ADMIN_EMAILS` | comma-separated e-mails allowed to approve feedback (optional) |
| `CONTACT_*`, `SMTP_*` | see 4.4 (optional) |

The API **exits at start-up with a clear list of problems** if something required is missing or unsafe (short `JWT_SECRET`, localhost database, `http://` origin, no `ML_SERVICE_URL`). Read the Render *Logs* tab if a deploy fails.

### 4.3 Check it
Open `https://<your-service>.onrender.com/healthz` → `ok`, then `/api/health` → shows database and AI-service status (the first call may take ~1 minute while the free instance wakes up).

### 4.4 E-mail (password reset, contact form) – read this
Render's free plan **blocks SMTP ports 25/465/587**, so Gmail's usual `smtp.gmail.com:587` will not connect. Options:
* Use an e-mail provider that offers SMTP on **port 2525** (several transactional-mail providers document this – check your provider's SMTP page), and set
  `SMTP_HOST`, `SMTP_PORT=2525`, `SMTP_SECURE=false`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
* Or upgrade Render to a paid instance, which allows normal SMTP.
* Without SMTP, "Forgot password" shows a clear error in production (reset links are never returned in API responses) and contact-form messages are still **saved in MongoDB**.

### 4.5 Keep the API awake (optional)
* Free 750 instance-hours cover one always-on service (31 days × 24 h = 744 h).
* Easiest: a free monitor such as UptimeRobot pinging `https://<service>.onrender.com/healthz` every 5 minutes; or
* GitHub: Settings → Secrets and variables → Actions → **Variables** → add `API_URL` = your Render URL; the included `.github/workflows/keepalive.yml` pings it every 10 minutes (GitHub may delay runs and pauses schedules after 60 days of repo inactivity).

---

## 5. Website – Vercel (free)

1. **Edit `frontend/vercel.json`**: replace `YOUR-API-NAME` in the `destination` with your Render service name
   (e.g. `https://cropnexus-api.onrender.com/api/:path*`). Commit and push.
2. <https://vercel.com> → **Add New → Project** → import the GitHub repo.
3. Settings on the import screen:
   * **Root Directory:** `frontend`
   * **Framework Preset:** Vite (auto-detected) · Build `npm run build` · Output `dist`
   * Environment variables: **none** (leave `VITE_API_URL` unset – same-domain mode).
4. **Deploy**. You get a URL like `https://cropnexus.vercel.app`.
5. **Go back to Render** → `cropnexus-api` → Environment → set `CLIENT_ORIGIN=https://cropnexus.vercel.app` (your real URL, no slash) → save (it redeploys).
6. Open the site → sign up → log in. Done.

Notes
* Vercel's Hobby plan is meant for personal / non-commercial use; check Vercel's current terms before running a commercial service.
* `vercel.json` also adds security headers (CSP, HSTS, no-framing), long-term caching for `/assets/*`, and tells Vercel never to cache `/api/*` responses (important – they are per-user).
* Custom domain: Vercel project → Settings → Domains. Then update `CLIENT_ORIGIN` on Render to the new domain.

---

## 6. Alternative front-end hosts

**Netlify** (`frontend/netlify.toml` is included): New site → Import from Git → base directory `frontend` (the file sets build/publish and the `/api/*` proxy). Replace `YOUR-API-NAME` in the file first. Environment variables: none.

**Cloudflare Pages / GitHub Pages / any static host** (no server-side proxy): build the site with the API address baked in and let the browser call the API directly:
1. Build env `VITE_API_URL=https://<your-api>.onrender.com`.
2. On Render set `CLIENT_ORIGIN=https://<your-site>`, `COOKIE_SAMESITE=none`, `TRUST_PROXY=1`.
Cookies are then *cross-site* (`SameSite=None; Secure`). Some browsers block third-party cookies in strict privacy modes, so the **same-domain (rewrite) setup in §5 is more reliable**.

---

## 7. Final verification checklist

Run these after everything is deployed:

- [ ] `https://<ml-url>/health` → `"status":"ok"` and the three models `true`
- [ ] `https://<ml-url>/predict/crop` without a key → **401**
- [ ] `https://<api>/healthz` → `ok`; `https://<api>/api/health` → database and AI service **reachable**
- [ ] Open the Vercel site → Landing page loads, no console errors
- [ ] Sign up (6 steps) → you land on Home logged in; refresh the page → still logged in
- [ ] Log out → log in again (note the 3-minute cooldown after logout is intentional)
- [ ] Crop Recommendation returns results (first call after idle may take ~40 s)
- [ ] Plant Health: upload a leaf photo → diagnosis returned
- [ ] Weather loads for a location; Soil, Water, Resources, Calendar open
- [ ] Mobile phone: menu button at the top-right, header stays at the top
- [ ] MongoDB Atlas → Browse Collections → your user appears in `USERS`

---

## 8. Environment variable reference

**API (Render)** – see `.env.example` for every option
`NODE_ENV, JWT_SECRET, MONGO_URI, CLIENT_ORIGIN, ML_SERVICE_URL, ML_SERVICE_KEY, TRUST_PROXY, COOKIE_SAMESITE, LOG_REQUESTS, ADMIN_EMAILS, RATE_LIMIT_MAX, LOGIN_COOLDOWN_SECONDS, MAX_FAILED_LOGINS, LOCKOUT_MINUTES, CONTACT_*, SMTP_*`

**AI service (Cloud Run / Railway)**
`ML_SERVICE_KEY` (required, ≥ 16 chars) · `PORT` (set by the platform) · `ML_ALLOWED_ORIGINS` (leave empty) · `ML_REQUIRE_KEY=true` (set in the Dockerfile)

**Website (build time)** – `VITE_API_URL` (leave empty unless §6 cross-domain mode)

---

## 9. Operating it

* **Deploy updates:** `git push` to `main` → Vercel and Render rebuild automatically; Cloud Run needs the `gcloud run deploy` command (§3.4).
* **Logs:** Render → Logs; Vercel → Deployments → Logs; Cloud Run → `gcloud run services logs read cropnexus-ml --region asia-south1`. The API logs one line per request (method, path, status, time) – never passwords, cookies, tokens or IPs.
* **Rotating secrets:** change `JWT_SECRET` on Render (everyone is logged out); change `ML_SERVICE_KEY` on **both** Render and Cloud Run.
* **Costs/limits to watch:** Render free hours and bandwidth, Atlas storage (0.5 GB), Cloud Run free allowance and Artifact Registry storage.
* **CI:** `.github/workflows/ci.yml` runs type-checks, the API tests, the frontend build and the ML tests on every push.
* **Security already in the code:** HttpOnly + Secure session cookie, CSRF header check, bcrypt (cost 12), account lockout, rate limits, helmet headers + CSP, strict production config validation, service key between API and AI service, non-root containers.

### Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Render deploy fails with "Invalid production configuration" | Read the listed items in the log and fix the env vars |
| Login works on `localhost` but not on Vercel | `CLIENT_ORIGIN` wrong (must match the site exactly, no trailing `/`), or `vercel.json` still has `YOUR-API-NAME` |
| Everything very slow after a quiet period | Free services are waking up (API ≈ 1 min, AI ≈ 40 s) – see §4.5 |
| "AI service is not reachable" | Wrong `ML_SERVICE_URL`, or Cloud Run still waking; check `…/health` |
| 401 from the AI service in API logs | `ML_SERVICE_KEY` differs between Render and Cloud Run |
| Everyone seems to share one rate limit | `TRUST_PROXY` too low – use `2` behind Vercel + Render |
| Reset e-mail not delivered | Render blocks SMTP 25/465/587 – use port 2525 provider (§4.4) |
| Atlas "connection timed out" | Atlas Network Access must allow `0.0.0.0/0` |
| Live counters show "–" | AI service or database asleep/unreachable; they refresh automatically |

---

## 10. Single-server alternative (VPS or your own PC)

The Express server can also serve the built website, so one process serves everything:
```bash
npm run setup && npm run build
NODE_ENV=production JWT_SECRET=... MONGO_URI=... CLIENT_ORIGIN=https://your-domain ML_SERVICE_URL=http://127.0.0.1:8000 npm start
# and, in another process, the AI service:  cd ml_service && pip install -r requirements.txt && uvicorn main:app --port 8000
```
Put Caddy or nginx in front for HTTPS (`TRUST_PROXY=1`).

---

## 11. What was and was not tested

Tested here: API unit/integration tests (44), AI-service tests in a clean install of the pinned requirements (3),
production-mode AI service (key enforced, real crop and leaf predictions, `/docs` disabled), production start-up validation,
frontend type-check and production build, browser checks of navbar behaviour on desktop and a 390 px phone.

**Not** tested from here (no Docker daemon or your accounts are available): building the Docker images, and the live Render / Vercel / Cloud Run / Atlas deployments. The configuration follows each platform's current documentation, but use the checklist in §7 after your first deployment and fix any platform-specific message that appears.

### Sources
* Render free tier: <https://render.com/docs/free>
* MongoDB Atlas M0 limits: <https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/>
* Cloud Run pricing: <https://cloud.google.com/run/pricing>
* Vercel rewrites to external origins: <https://vercel.com/docs/routing/rewrites>
* Hugging Face Docker Spaces / PRO: <https://discuss.huggingface.co/t/docker-sdk-now-marked-as-paid-when-creating-a-new-space/177580>
