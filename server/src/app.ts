import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import type { Config } from "./config.js";
import type { DbHandle } from "./db.js";
import { advisoryRouter } from "./routes/advisory.js";
import { feedbackRouter } from "./routes/feedback.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { statsRouter } from "./routes/stats.js";
import { calendarRouter } from "./routes/calendar.js";
import { contactRouter } from "./routes/contact.js";
import { productsRouter } from "./routes/products.js";
import { resourcesRouter } from "./routes/resources.js";
import { soilRouter } from "./routes/soil.js";
import { waterRouter } from "./routes/water.js";
import { weatherRouter } from "./routes/weather.js";
import { defaultHttp, UpstreamError, type Http } from "./services/http.js";
import { MlClient, MlError } from "./services/ml.js";
import { createNotifier, type Notifier } from "./services/notify.js";

export function createApp(cfg: Config, db: Pick<DbHandle, "stores" | "ping">, ml = new MlClient(cfg), notifier: Notifier = createNotifier(cfg), http: Http = defaultHttp) {
  const app = express();
  app.set("trust proxy", cfg.trustProxy);
  app.use(
    helmet({
      // CSP only matters for the HTML that Express serves itself (single-host deployments). The API returns JSON.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'", "'sha256-MQ6G05u+W3oNNJZXovC4YZmfP1SqD7xe5XnttYAEhpo='"], // the tiny theme-init script in index.html
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:", "blob:", "https:"],
          "font-src": ["'self'", "data:"],
          "connect-src": ["'self'", ...(cfg.isProd ? cfg.clientOrigins : [])],
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          "form-action": ["'self'"],
          "frame-ancestors": ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      strictTransportSecurity: cfg.isProd ? { maxAge: 15_552_000, includeSubDomains: true } : false,
    })
  );
  app.disable("x-powered-by");
  if (cfg.logRequests) {
    // One line per request: method, path (no query string, so no tokens), status, duration. No bodies, cookies or IPs.
    app.use((req, res, next) => {
      const t0 = process.hrtime.bigint();
      res.on("finish", () => {
        if (req.path === "/healthz") return;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Number((process.hrtime.bigint() - t0) / 1_000_000n)}ms`);
      });
      next();
    });
  }
  app.use(cors({ origin: cfg.isProd ? cfg.clientOrigins : true, credentials: true }));
  app.get("/healthz", (_req, res) => res.type("text/plain").send("ok")); // liveness probe: no dependencies, answers instantly
  app.use("/api", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); }); // API responses are never cached
  app.use(express.json({ limit: "200kb" }));

  app.get("/api/health", async (_req, res) => {
    const [mongo, mlHealth] = await Promise.all([db.ping(), ml.health()]);
    res.json({ server: "ok", mongodb: mongo ? "connected" : "unreachable", mlService: mlHealth ? "connected" : "unreachable", ml: mlHealth });
  });

  // Public, real model figures for the landing page (cached 10 min)
  let summary: { at: number; data: unknown } | null = null;
  app.get("/api/model-summary", async (_req, res) => {
    if (!summary || Date.now() - summary.at > 600_000) {
      try {
        const m = await ml.modelInfo();
        summary = { at: Date.now(), data: { cropAccuracy: m.crop_model?.test_accuracy ?? null, cropCount: m.crop_model?.n_classes ?? null, leafClasses: m.leaf_model?.n_classes ?? null, leafAccuracy: m.leaf_model?.test_accuracy ?? null, soilAccuracy: (m as any).soil_model?.test_accuracy ?? null, soilClasses: (m as any).soil_model?.n_classes ?? null } };
      } catch {
        return res.json({ cropAccuracy: null, cropCount: null, leafClasses: null, leafAccuracy: null, soilAccuracy: null, soilClasses: null });
      }
    }
    res.json(summary.data);
  });

  const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: cfg.rateLimitMax, standardHeaders: true, legacyHeaders: false, message: { error: "Too many attempts. Please try again later." } });
  app.use("/api/auth", authLimiter, authRouter(cfg, db.stores, notifier));
  // Public endpoints that call third-party APIs get their own per-IP limiter so they cannot be used to exhaust our upstream quotas.
  const publicLimiter = rateLimit({ windowMs: 60_000, limit: cfg.publicRateLimitMax, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests. Please slow down and try again in a minute." } });
  app.use("/api/weather", publicLimiter, weatherRouter(http));
  app.use("/api/water", publicLimiter, waterRouter(http));
  app.use("/api/soil", soilRouter(cfg, db.stores, ml));
  app.use("/api/calendar", calendarRouter(cfg, db.stores));
  app.use("/api/products", productsRouter(cfg));
  app.use("/api/resources", publicLimiter, resourcesRouter(cfg, http));
  app.use("/api/contact", contactRouter(cfg, db.stores, notifier));
  app.use("/api/stats", statsRouter(cfg, db.stores));
  app.use("/api/profile", profileRouter(cfg, db.stores));
  app.use("/api/feedback", feedbackRouter(cfg, db.stores));
  app.use("/api", advisoryRouter(cfg, db.stores, ml));
  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

  // Serve the built React app (frontend/dist) with SPA fallback, if it exists.
  if (fs.existsSync(path.join(cfg.frontendDist, "index.html"))) {
    app.use(express.static(cfg.frontendDist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(cfg.frontendDist, "index.html")));
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof UpstreamError) return res.status(err.status === 504 ? 504 : 502).json({ error: err.message, code: err.code });
    if (err instanceof MlError) return res.status(err.status).json({ error: err.message });
    if (err instanceof multer.MulterError) {
      return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Image is too large (max 12 MB)." : err.message });
    }
    if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON body." });
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  };
  app.use(onError);
  return app;
}
