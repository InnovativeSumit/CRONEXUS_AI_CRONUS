import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { MlClient } from "../src/services/ml.js";
import type { Notifier } from "../src/services/notify.js";
import { memoryStores } from "./memdb.js";

const cfg = loadConfig({ bcryptRounds: 4, loginCooldownSeconds: 2, rateLimitMax: 10_000, sendRateLimitMax: 10_000, publicRateLimitMax: 10_000, frontendDist: "/nonexistent" });
const stores = memoryStores();
// Captures what would be e-mailed so tests can read the reset link (the real API never returns it).
const outbox: { to: string; text: string }[] = [];
const notifier: Notifier = {
  emailMode: "console",
  sendEmail: async (to: string, _s: string, text: string) => { outbox.push({ to, text }); },
};
const fakeMl = Object.assign(new MlClient(cfg), {
  health: async () => ({ status: "ok" }),
  crop: async (i: any) => ({ top_crops: [{ crop: "rice", confidence: 99 }], recommended_crop: "rice", info: {}, tips: ["ok"], inputs: { N: i.nitrogen } }),
  leaf: async () => ({ top_predictions: [{ class: "Apple___healthy", confidence: 90 }], info: { disease_name: "Healthy" } }),
  modelInfo: async () => ({ crop_model: { n_classes: 30, test_accuracy: 0.97 }, leaf_model: { n_classes: 10, test_accuracy: 0.9196 } }),
});
const app = createApp(cfg, { stores, ping: async () => true }, fakeMl, notifier);
const api = () => request(app);
const CSRF = { "X-Requested-With": "cropnexus" };
const user = { name: "Asha Rao", age: 29, email: "Asha@Example.com", country: "IN", phone: "+91 98765-43210", password: "Secret123", confirmPassword: "Secret123" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let cookie = "";
const auth = () => ({ Cookie: cookie, ...CSRF });
const cookieOf = (r: request.Response) => ((r.headers["set-cookie"] as unknown as string[] | undefined) ?? []).map((c) => c.split(";")[0]).find((c) => c.startsWith("cn_session=")) ?? "";

/** Registers an account (no verification step). */
const register = (over: Record<string, unknown> = {}) => api().post("/api/auth/signup").send({ ...user, ...over });

describe("signup (no OTP step)", () => {
  it("rejects invalid input field by field", async () => {
    let r = await register({ confirmPassword: "nope" });
    assert.equal(r.status, 400);
    assert.match(r.body.fields.confirmPassword, /do not match/);
    assert.equal((await register({ name: "A" })).status, 400);
    assert.equal((await register({ age: 200 })).status, 400);
    assert.equal((await register({ age: undefined })).status, 400);
    assert.equal((await register({ email: "bad" })).status, 400);
    assert.equal((await register({ phone: "12345" })).status, 400);
    r = await register({ password: "short", confirmPassword: "short" });
    assert.equal(r.status, 400);
    assert.equal((await register({ password: "allletters", confirmPassword: "allletters" })).status, 400);
  });
  it("creates an account (E.164 phone, country, bcrypt hash, createdAt) and sets an HttpOnly cookie", async () => {
    const r = await register();
    assert.equal(r.status, 201, JSON.stringify(r.body));
    cookie = cookieOf(r);
    assert.ok(cookie);
    assert.match(String(r.headers["set-cookie"]), /HttpOnly/i);
    assert.match(String(r.headers["set-cookie"]), /SameSite=Strict/i);
    assert.equal(r.body.token, undefined, "no token in the JSON body");
    assert.equal(r.body.user.email, "asha@example.com");
    assert.equal(r.body.user.phone, "+919876543210");
    assert.equal(r.body.user.country, "IN");
    const doc: any = await stores.users.findOne({ email: "asha@example.com" });
    assert.match(doc.passwordHash, /^\$2[aby]\$/);
    assert.ok(!JSON.stringify(doc).includes("Secret123"));
    assert.ok(doc.createdAt instanceof Date);
    assert.equal(r.body.user.passwordHash, undefined);
    assert.ok(!JSON.stringify(r.body).includes("$2"));
  });
  it("enforces unique e-mail (case-insensitive) and unique mobile number", async () => {
    const e = await register({ email: "ASHA@example.com", phone: "+919876543211" });
    assert.equal(e.status, 409);
    assert.ok(e.body.fields.email);
    const p = await register({ email: "other-person@example.com" });
    assert.equal(p.status, 409);
    assert.ok(p.body.fields.phone);
  });
});

describe("login / logout / cooldown / lockout", () => {
  it("protected routes need the session cookie (and a CSRF header for writes)", async () => {
    assert.equal((await api().get("/api/history")).status, 401);
    assert.equal((await api().get("/api/auth/me").set({ Cookie: cookie })).status, 200);
    assert.equal((await api().post("/api/feedback").set({ Cookie: cookie }).send({})).status, 403);
    assert.equal((await api().get("/api/auth/me").set({ Authorization: "Bearer abc" })).status, 401);
  });
  it("wrong password → 401, and the account locks after repeated failures", async () => {
    assert.equal((await api().post("/api/auth/login").send({ email: "nobody@x.com", password: "Wrong1234" })).status, 401);
    for (let i = 0; i < 5; i++) assert.equal((await api().post("/api/auth/login").send({ email: user.email, password: "Wrong1234" })).status, 401);
    const locked = await api().post("/api/auth/login").send({ email: user.email, password: user.password });
    assert.equal(locked.status, 429);
    assert.equal(locked.body.code, "ACCOUNT_LOCKED");
    await stores.users.updateOne({ email: "asha@example.com" } as any, { $set: { lockUntil: null } } as any); // simulate lock expiry
  });
  it("logout revokes the session and starts the cooldown", async () => {
    const out = await api().post("/api/auth/logout").set(auth());
    assert.equal(out.status, 200);
    assert.equal((await api().get("/api/auth/me").set({ Cookie: cookie })).status, 401);
    const r = await api().post("/api/auth/login").send({ email: user.email, password: user.password });
    assert.equal(r.status, 429);
    assert.equal(r.body.code, "LOGIN_COOLDOWN");
    assert.ok(r.body.retryAfterSeconds >= 1 && r.body.retryAfterSeconds <= 2);
  });
  it("allows login again after the cooldown", async () => {
    await sleep(2100);
    const r = await api().post("/api/auth/login").send({ email: " ASHA@example.com ", password: user.password });
    assert.equal(r.status, 200);
    cookie = cookieOf(r);
  });
});

describe("reset password (e-mail)", () => {
  const link = () => {
    const m = [...outbox].reverse().find((o) => /reset-password\?token=/.test(o.text));
    return /token=([a-f0-9]+)/.exec(m?.text ?? "")?.[1] ?? "";
  };
  it("does not reveal unknown e-mails and never returns the token", async () => {
    const r = await api().post("/api/auth/forgot-password").send({ email: "ghost@x.com" });
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body).sort(), ["message", "ok"]);
  });
  it("resets with a valid token only once", async () => {
    const f = await api().post("/api/auth/forgot-password").send({ email: user.email });
    assert.deepEqual(Object.keys(f.body).sort(), ["message", "ok"]);
    const t = link();
    assert.ok(t);
    assert.equal((await api().post("/api/auth/reset-password").send({ token: "x".repeat(64), password: "NewPass123", confirmPassword: "NewPass123" })).status, 400);
    assert.equal((await api().post("/api/auth/reset-password").send({ token: t, password: "NewPass123", confirmPassword: "Different1" })).status, 400);
    assert.equal((await api().post("/api/auth/reset-password").send({ token: t, password: "NewPass123", confirmPassword: "NewPass123" })).status, 200);
    assert.equal((await api().post("/api/auth/reset-password").send({ token: t, password: "Another123", confirmPassword: "Another123" })).status, 400);
    assert.equal((await api().get("/api/auth/me").set({ Cookie: cookie })).status, 401); // old session revoked
    assert.equal((await api().post("/api/auth/login").send({ email: user.email, password: user.password })).status, 401);
    const ok = await api().post("/api/auth/login").send({ email: user.email, password: "NewPass123" });
    assert.equal(ok.status, 200);
    cookie = cookieOf(ok);
  });
});

describe("stats + ml gateway", () => {
  it("reports live registration/login numbers", async () => {
    const r = await api().get("/api/stats");
    assert.equal(r.body.totalUsers, 1);
    assert.equal(r.body.registrationsToday, 1);
    assert.ok(r.body.totalLogins >= 3);
    assert.equal(r.body.onlineNow, 1);
    assert.equal(r.body.last7Days.length, 7);
  });
  it("advisory + history + leaf", async () => {
    const body = { nitrogen: 90, phosphorus: 42, potassium: 43, temperature: 21, humidity: 82, ph: 6.5, rainfall: 200, location: "Nadia" };
    assert.equal((await api().post("/api/advisory").set(auth()).send({ ...body, ph: 20 })).status, 400);
    assert.equal((await api().post("/api/advisory").set(auth()).send(body)).body.recommended_crop, "rice");
    const leaf = await api().post("/api/leaf-disease").set(auth()).attach("leaf_image", Buffer.from("fakejpg"), { filename: "a.jpg", contentType: "image/jpeg" });
    assert.equal(leaf.status, 200);
    assert.equal((await api().post("/api/leaf-disease").set(auth())).status, 400);
    const h = await api().get("/api/history").set(auth());
    assert.equal(h.body.length, 2);
    assert.equal(h.body[0].type, "leaf");
    assert.equal((await api().get("/api/health")).body.mongodb, "connected");
  });
});

describe("age groups, profile, feedback", () => {
  it("rejects a missing/invalid age and reports real age distribution", async () => {
    assert.equal((await register({ email: "x1@x.com", phone: "+919876543211", age: undefined })).status, 400);
    assert.equal((await register({ email: "x1@x.com", phone: "+919876543211", age: 200 })).status, 400);
    for (const [i, a] of [10, 20, 40, 41].entries()) {
      const r = await register({ email: `age${i}@x.com`, phone: `+91987654322${i}`, age: a });
      assert.equal(r.status, 201, JSON.stringify(r.body));
    }
    const s = (await api().get("/api/stats")).body;
    const by = Object.fromEntries(s.ageGroups.map((g: any) => [g.group, g.count]));
    assert.deepEqual(by, { "0-17": 1, "18-24": 1, "25-30": 1, "30+": 2 }); // Asha=29 → 25-30
    assert.equal(s.ageTotal, 5);
    assert.equal(s.totalUsers, 5);
  });
  it("online count expires without heartbeat", async () => {
    const before = (await api().get("/api/stats")).body.onlineNow;
    await stores.users.updateOne({ email: "age0@x.com" } as any, { $set: { lastSeenAt: new Date(Date.now() - 10 * 60_000) } } as any);
    assert.equal((await api().get("/api/stats")).body.onlineNow, before - 1);
  });
  it("updates profile name + preset avatar + photo; rejects bad avatars", async () => {
    let r = await api().patch("/api/profile").set(auth()).send({ name: "Asha R", avatar: "preset:f2" });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.name, "Asha R");
    assert.equal(r.body.user.avatar, "preset:f2");
    assert.equal((await api().get("/api/auth/me").set(auth())).body.user.avatar, "preset:f2");
    assert.equal((await api().patch("/api/profile").set(auth()).send({ avatar: "preset:zz" })).status, 400);
    assert.equal((await api().patch("/api/profile").set(auth()).send({ avatar: "data:text/html;base64,AAAA" })).status, 400);
    assert.equal((await api().patch("/api/profile").set(auth()).send({ avatar: "data:image/jpeg;base64," + "A".repeat(130_000) })).status, 400);
    r = await api().patch("/api/profile").set(auth()).send({ avatar: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD" });
    assert.equal(r.status, 200);
    assert.equal((await api().patch("/api/profile").set(auth()).send({})).status, 200);
    assert.equal((await api().patch("/api/profile").set(CSRF)).status, 401);
  });
  it("feedback: 1–5 stars, validation, 2 per account, public list shows only real reviews", async () => {
    assert.equal((await api().get("/api/feedback")).body.count, 0);
    const ok = { name: "Asha", text: "Very helpful crop advice for my farm", rating: 5 };
    assert.equal((await api().post("/api/feedback").set(CSRF).send(ok)).status, 401);
    assert.equal((await api().post("/api/feedback").set(auth()).send({ ...ok, rating: 0 })).status, 400);
    assert.equal((await api().post("/api/feedback").set(auth()).send({ ...ok, rating: 6 })).status, 400);
    assert.equal((await api().post("/api/feedback").set(auth()).send({ ...ok, text: Array(31).fill("w").join(" ") })).status, 400);
    assert.equal((await api().post("/api/feedback").set(auth()).send({ ...ok, text: Array(30).fill("w").join(" "), rating: 3 })).status, 201);
    assert.equal((await api().post("/api/feedback").set(auth()).send({ ...ok, rating: 4 })).status, 201);
    const third = await api().post("/api/feedback").set(auth()).send(ok);
    assert.equal(third.status, 409);
    assert.equal(third.body.code, "FEEDBACK_LIMIT");
    const pub = (await api().get("/api/feedback")).body;
    assert.equal(pub.count, 2);
    assert.equal(pub.average, 3.5);
    assert.equal((await api().get("/api/model-summary")).status, 200);
    const mine = (await api().get("/api/feedback/mine").set(auth())).body;
    assert.equal(mine.remaining, 0);
    // delete: only the owner can delete; deleting frees a slot and removes it from the public list
    const o = await register({ email: "other@x.com", phone: "+919876543299", age: 30 });
    const other = { Cookie: cookieOf(o), ...CSRF };
    const id = mine.items[0].id;
    assert.equal((await api().delete(`/api/feedback/${id}`).set(other)).status, 404);
    assert.equal((await api().delete(`/api/feedback/${id}`).set(auth())).status, 200);
    assert.equal((await api().delete(`/api/feedback/${id}`).set(auth())).status, 404);
    assert.equal((await api().delete(`/api/feedback/${id}`).set(CSRF)).status, 401);
    assert.equal((await api().get("/api/feedback")).body.count, 1);
    assert.equal((await api().get("/api/feedback/mine").set(auth())).body.remaining, 1);
    assert.equal((await api().patch(`/api/feedback/${pub.items[0].id}`).set(auth()).send({ status: "rejected" })).status, 403);
  });
});

describe("no secrets in responses", () => {
  it("auth/config exposes only delivery modes", async () => {
    const r = await api().get("/api/auth/config");
    assert.deepEqual(Object.keys(r.body).sort(), ["emailDelivery", "loginCooldownSeconds"]);
  });
  it("me/profile never include hashes or tokens", async () => {
    const txt = JSON.stringify((await api().get("/api/auth/me").set(auth())).body);
    for (const k of ["passwordHash", "tokenVersion", "resetToken", "$2a$", "$2b$", "failedLogins"]) assert.ok(!txt.includes(k), k);
  });
});
