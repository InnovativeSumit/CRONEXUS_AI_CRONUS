import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { assertProductionEnv, loadConfig } from "../src/config.js";
import { MlClient } from "../src/services/ml.js";
import { memoryStores } from "./memdb.js";

const GOOD = {
  JWT_SECRET: "a".repeat(48),
  MONGO_URI: "mongodb+srv://u:p@cluster0.example.mongodb.net/CROPNEXUS",
  CLIENT_ORIGIN: "https://cropnexus.vercel.app",
  ML_SERVICE_URL: "https://ml.example.run.app",
} as unknown as NodeJS.ProcessEnv;
const origins = (e: NodeJS.ProcessEnv) => String(e.CLIENT_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
const problems = (e: NodeJS.ProcessEnv) => { try { assertProductionEnv(e, origins(e)); return ""; } catch (x: any) { return String(x.message); } };

describe("production configuration check", () => {
  it("accepts a complete, correct production environment", () => assert.equal(problems(GOOD), ""));
  it("rejects missing/short/default secrets", () => {
    assert.match(problems({ ...GOOD, JWT_SECRET: "" }), /JWT_SECRET/);
    assert.match(problems({ ...GOOD, JWT_SECRET: "short" }), /too short/);
    assert.match(problems({ ...GOOD, JWT_SECRET: "change-this-to-a-long-random-string" }), /JWT_SECRET/);
  });
  it("rejects a localhost or missing database", () => {
    assert.match(problems({ ...GOOD, MONGO_URI: "mongodb://localhost:27017/CROPNEXUS" }), /localhost/);
    assert.match(problems({ ...GOOD, MONGO_URI: "" }), /MONGO_URI/);
  });
  it("rejects http, trailing-slash, path and garbage origins", () => {
    assert.match(problems({ ...GOOD, CLIENT_ORIGIN: "http://example.com" }), /https/);
    assert.match(problems({ ...GOOD, CLIENT_ORIGIN: "https://example.com/" }), /no path or trailing slash/);
    assert.match(problems({ ...GOOD, CLIENT_ORIGIN: "not a url" }), /not a valid URL/);
    assert.match(problems({ ...GOOD, CLIENT_ORIGIN: "" }), /CLIENT_ORIGIN/);
  });
  it("requires the AI service URL", () => assert.match(problems({ ...GOOD, ML_SERVICE_URL: "" }), /ML_SERVICE_URL/));
  it("reports every problem at once", () => {
    const m = problems({} as NodeJS.ProcessEnv);
    for (const k of ["JWT_SECRET", "MONGO_URI", "CLIENT_ORIGIN", "ML_SERVICE_URL"]) assert.match(m, new RegExp(k));
  });
});

describe("liveness, headers and cookie mode", () => {
  const base = { bcryptRounds: 4, rateLimitMax: 10_000, frontendDist: "/nonexistent" };
  const mk = (over = {}) => {
    const cfg = loadConfig({ ...base, ...over });
    return createApp(cfg, { stores: memoryStores(), ping: async () => true }, Object.assign(new MlClient(cfg), { health: async () => ({ status: "ok" }) }));
  };
  it("GET /healthz answers instantly without touching the database or AI service", async () => {
    const r = await request(mk()).get("/healthz");
    assert.equal(r.status, 200);
    assert.equal(r.text, "ok");
  });
  it("sets security headers and hides the framework", async () => {
    const r = await request(mk()).get("/api/health");
    assert.equal(r.headers["x-powered-by"], undefined);
    assert.equal(r.headers["x-content-type-options"], "nosniff");
    assert.match(String(r.headers["content-security-policy"]), /frame-ancestors 'none'/);
    assert.equal(r.headers["cache-control"], "no-store");
  });
  it("COOKIE mode none → SameSite=None; Secure (cross-site hosting)", async () => {
    const app = mk({ cookieSameSite: "none" });
    const r = await request(app).post("/api/auth/signup").set("X-Requested-With", "cropnexus").send({ name: "Ravi Kumar", age: 31, email: "ravi@example.com", country: "IN", phone: "+91 98765-11111", password: "Secret123", confirmPassword: "Secret123" });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const c = String(r.headers["set-cookie"]);
    assert.match(c, /SameSite=None/i);
    assert.match(c, /Secure/i);
    assert.match(c, /HttpOnly/i);
  });
});
