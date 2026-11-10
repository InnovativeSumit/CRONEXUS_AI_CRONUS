import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, "..");
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, "..");

// Project-root .env first (shared with ml_service), then server/.env overrides.
dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });
dotenv.config({ path: path.join(SERVER_ROOT, ".env"), override: true });

const isProd = process.env.NODE_ENV === "production";
const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : d);

export interface Config {
  port: number;
  isProd: boolean;
  mongoUri: string;
  usersCollection: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  mlServiceUrl: string;
  mlServiceKey: string;
  clientOrigins: string[];
  loginCooldownSeconds: number;
  resetTokenMinutes: number;
  cookieName: string;
  cookieSameSite: "strict" | "lax" | "none";
  trustProxy: number;
  logRequests: boolean;
  sendRateLimitMax: number;
  maxFailedLogins: number;
  lockoutMinutes: number;
  allowConsoleDelivery: boolean;
  smtp: { host: string; port: number; secure: boolean; user: string; pass: string; from: string };
  rateLimitMax: number;
  adminEmails: string[];
  feedbackAutoPublish: boolean;
  onlineWindowSeconds: number;
  frontendDist: string;
  dataDir: string;
  contactRateLimit: number;
  publicRateLimitMax: number;
  contact: { toEmail: string; developerName: string; developerPhone: string; developerEmail: string };
}

/** Collects every production misconfiguration so the operator can fix them in one go (fail fast instead of half-working). */
export function assertProductionEnv(env: NodeJS.ProcessEnv, clientOrigins: string[]) {
  const problems: string[] = [];
  const secret = env.JWT_SECRET || "";
  if (!secret || secret.startsWith("cropnexus-dev") || secret.startsWith("change-this")) problems.push("JWT_SECRET must be set to a long random value (>= 32 characters).");
  else if (secret.length < 32) problems.push("JWT_SECRET is too short (use at least 32 characters).");
  if (!env.MONGO_URI) problems.push("MONGO_URI is not set (e.g. your MongoDB Atlas connection string).");
  else if (/localhost|127\.0\.0\.1/.test(env.MONGO_URI)) problems.push("MONGO_URI points to localhost; use a hosted MongoDB (e.g. Atlas).");
  if (!env.CLIENT_ORIGIN) problems.push("CLIENT_ORIGIN is not set (the public https:// address of your website, used for CORS and e-mail links).");
  else for (const o of clientOrigins) {
    try {
      const u = new URL(o);
      if (u.protocol !== "https:" && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) problems.push(`CLIENT_ORIGIN "${o}" must use https://.`);
      if (u.pathname !== "/" || o.endsWith("/")) problems.push(`CLIENT_ORIGIN "${o}" must be an origin only, with no path or trailing slash.`);
    } catch { problems.push(`CLIENT_ORIGIN "${o}" is not a valid URL.`); }
  }
  if (!env.ML_SERVICE_URL) problems.push("ML_SERVICE_URL is not set (the public URL of the FastAPI AI service).");
  if (problems.length) throw new Error("Invalid production configuration:\n - " + problems.join("\n - "));
}

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const jwtSecret = process.env.JWT_SECRET || "cropnexus-dev-jwt-secret-change-me";
  const clientOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean);
  if (isProd) assertProductionEnv(process.env, clientOrigins);
  const sameSiteRaw = (process.env.COOKIE_SAMESITE || "strict").toLowerCase();
  const cookieSameSite = (["strict", "lax", "none"].includes(sameSiteRaw) ? sameSiteRaw : "strict") as Config["cookieSameSite"];
  return {
    port: num(process.env.PORT, 5050),
    isProd,
    mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/CROPNEXUS",
    usersCollection: process.env.MONGO_USERS_COLLECTION || "USERS",
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    bcryptRounds: num(process.env.BCRYPT_ROUNDS, 12),
    mlServiceUrl: (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/\/$/, ""),
    mlServiceKey: process.env.ML_SERVICE_KEY || "",
    clientOrigins,
    loginCooldownSeconds: num(process.env.LOGIN_COOLDOWN_SECONDS, 180), // 3 minutes
    resetTokenMinutes: num(process.env.RESET_TOKEN_MINUTES, 15),
    cookieName: "cn_session",
    cookieSameSite,
    trustProxy: num(process.env.TRUST_PROXY, 1), // number of reverse proxies in front of the API (Render = 1; Vercel rewrite + Render = 2)
    logRequests: process.env.LOG_REQUESTS ? process.env.LOG_REQUESTS === "true" : isProd,
    sendRateLimitMax: num(process.env.SEND_RATE_LIMIT_MAX, 20), // per IP per 15 min for OTP/reset endpoints
    maxFailedLogins: num(process.env.MAX_FAILED_LOGINS, 5),
    lockoutMinutes: num(process.env.LOCKOUT_MINUTES, 15),
    // Without SMTP/SMS credentials, codes are printed in the SERVER terminal (never in an HTTP response).
    // That fallback is only allowed outside production unless explicitly enabled.
    allowConsoleDelivery: process.env.ALLOW_CONSOLE_DELIVERY ? process.env.ALLOW_CONSOLE_DELIVERY === "true" : !isProd,
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: num(process.env.SMTP_PORT, 587),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "CropNexus <no-reply@cropnexus.local>",
    },
    rateLimitMax: num(process.env.RATE_LIMIT_MAX, 100),
    adminEmails: (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
    feedbackAutoPublish: process.env.FEEDBACK_AUTO_PUBLISH !== "false",
    onlineWindowSeconds: num(process.env.ONLINE_WINDOW_SECONDS, 300),
    frontendDist: path.join(PROJECT_ROOT, "frontend", "dist"),
    dataDir: path.join(SERVER_ROOT, "data"),
    contactRateLimit: num(process.env.CONTACT_RATE_LIMIT, 5), // messages per IP per hour
    publicRateLimitMax: num(process.env.PUBLIC_RATE_LIMIT_MAX, 120), // requests per IP per minute to the public data endpoints (weather, water, resources)
    contact: {
      toEmail: process.env.CONTACT_TO_EMAIL || "",
      developerName: process.env.CONTACT_DEVELOPER_NAME || "",
      developerPhone: process.env.CONTACT_DEVELOPER_PHONE || "",
      developerEmail: process.env.CONTACT_DEVELOPER_EMAIL || "",
    },
    ...overrides,
  };
}
