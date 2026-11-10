import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { Http } from "../src/services/http.js";
import { UpstreamError } from "../src/services/http.js";
import type { Notifier } from "../src/services/notify.js";
import { loadProducts } from "../src/routes/products.js";
import { parseFeed } from "../src/services/rss.js";
import { kcFor, CROPS, plan } from "../src/services/water.js";
import { MlClient, MlError } from "../src/services/ml.js";
import { memoryStores } from "./memdb.js";

const cfg = loadConfig({ bcryptRounds: 4, rateLimitMax: 10_000, sendRateLimitMax: 10_000, publicRateLimitMax: 10_000, frontendDist: "/nonexistent", contactRateLimit: 4, contact: { toEmail: "owner@example.com", developerName: "", developerPhone: "", developerEmail: "" } });
const stores = memoryStores();
const mails: string[] = [];
const notifier: Notifier = { emailMode: "console", sendEmail: async (to: string, s: string) => { mails.push(`${to}|${s}`); } };

// ---- fake upstream providers (the real ones need internet / an API key) ----
const day = (n: number) => { const d = new Date(Date.UTC(2026, 9, 10 + n)); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`; };
const feedXml = `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title><item><title>Kharif sowing advances</title><link>https://example.org/a</link><description>&lt;p&gt;Sowing &lt;b&gt;up&lt;/b&gt;&lt;/p&gt;</description><pubDate>Sat, 10 Oct 2026 08:00:00 GMT</pubDate></item><item><title>Bad link</title><link>javascript:alert(1)</link></item></channel></rss>`;
const calls: string[] = [];
const http: Http = {
  async getJson(url: string) {
    calls.push(url);
    if (url.includes("geocoding-api")) return { results: [{ name: "Ludhiana", admin1: "Punjab", country: "India", latitude: 30.9, longitude: 75.85, timezone: "Asia/Kolkata" }] } as never;
    if (url.includes("api.open-meteo.com")) {
      const time = Array.from({ length: 7 }, (_, i) => `2026-10-${String(12 + i).padStart(2, "0")}`);
      return {
        latitude: 30.9, longitude: 75.85, timezone: "Asia/Kolkata",
        current: { time: "2026-10-12T10:00", temperature_2m: 31, apparent_temperature: 34, relative_humidity_2m: 40, precipitation: 0, weather_code: 1, wind_speed_10m: 9, wind_direction_10m: 200 },
        daily: { time, weather_code: time.map(() => 1), temperature_2m_max: time.map(() => 36), temperature_2m_min: time.map(() => 18), precipitation_sum: [0, 0, 0, 12, 0, 0, 0], precipitation_probability_max: time.map(() => 10), et0_fao_evapotranspiration: time.map(() => 5), wind_speed_10m_max: time.map(() => 14) },
      } as never;
    }
    throw new UpstreamError("unexpected " + url);
  },
  async getText(url: string) { if (url.includes("good-feed")) return feedXml; throw new UpstreamError("feed down"); },
};
let photoModel = true;
const fakeMl = Object.assign(new MlClient(cfg), {
  health: async () => ({ status: "ok" }),
  soilStatus: async () => ({ image_model_available: photoModel }),
  soilAssess: async (v: Record<string, number>) => ({ ratings: Object.keys(v).map((k) => ({ parameter: k, rating: "low" })), method: "rule-based" }),
  soilPhoto: async () => { if (!photoModel) throw new MlError("The soil-photo model has not been trained on this machine yet.", 503); return { top_predictions: [{ class: "Black_Soil", label: "Black soil (regur)", confidence: 81 }], info: {}, low_confidence: false }; },
});
const app = createApp(cfg, { stores, ping: async () => true }, fakeMl, notifier, http);
const api = () => request(app);
const CSRF = { "X-Requested-With": "cropnexus" };
const cookieOf = (r: request.Response) => ((r.headers["set-cookie"] as unknown as string[] | undefined) ?? []).map((c) => c.split(";")[0]).find((c) => c.startsWith("cn_session=")) ?? "";
async function newUser(n: number) {
  const r = await api().post("/api/auth/signup").send({ name: `User ${n}`, age: 30, email: `u${n}@example.com`, country: "IN", phone: `+9198765432${10 + n}`, password: "Secret123", confirmPassword: "Secret123" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return { Cookie: cookieOf(r), ...CSRF };
}

describe("crop calendar (CRUD, priorities, isolation)", () => {
  let a: Record<string, string>, b: Record<string, string>, id = "";
  it("requires authentication", async () => {
    assert.equal((await api().get("/api/calendar")).status, 401);
    a = await newUser(1); b = await newUser(2);
  });
  it("validates input", async () => {
    const ok = { title: "Sow wheat", dueDate: "2026-11-05", priority: 1, category: "sowing" };
    for (const bad of [{ ...ok, title: "" }, { ...ok, priority: 4 }, { ...ok, priority: 0 }, { ...ok, dueDate: "2026-02-30" }, { ...ok, dueDate: "tomorrow" }, { ...ok, category: "magic" }]) {
      assert.equal((await api().post("/api/calendar").set(a).send(bad)).status, 400, JSON.stringify(bad));
    }
  });
  it("creates, lists (sorted by date then priority), filters, edits, completes, reschedules, deletes", async () => {
    const mk = async (title: string, dueDate: string, priority: number) => (await api().post("/api/calendar").set(a).send({ title, dueDate, priority, category: "irrigation", description: "d" })).body.task;
    const t1 = await mk("Irrigate plot 1", "2026-10-20", 2);
    await mk("Apply urea", "2026-10-20", 1);
    await mk("Old task", "2026-10-01", 3);
    await mk("Harvest", "2026-12-01", 1);
    id = t1.id;
    const all = (await api().get("/api/calendar?today=2026-10-15").set(a)).body;
    assert.equal(all.items.length, 4);
    assert.deepEqual(all.items.map((t: any) => t.title), ["Old task", "Apply urea", "Irrigate plot 1", "Harvest"]);
    assert.equal(all.items[0].overdue, true);
    assert.equal(all.summary.overdue, 1);
    assert.equal((await api().get("/api/calendar?status=overdue&today=2026-10-15").set(a)).body.items.length, 1);
    assert.equal((await api().get("/api/calendar?priority=1&today=2026-10-15").set(a)).body.items.length, 2);
    assert.equal((await api().get("/api/calendar?from=2026-10-20&to=2026-10-31").set(a)).body.items.length, 2);
    // complete + reschedule + edit
    let r = await api().patch(`/api/calendar/${id}`).set(a).send({ completed: true });
    assert.equal(r.body.task.completed, true);
    assert.ok(r.body.task.completedAt);
    assert.equal((await api().get("/api/calendar?status=done").set(a)).body.items.length, 1);
    r = await api().patch(`/api/calendar/${id}`).set(a).send({ dueDate: "2026-10-25", title: "Irrigate plot 1 (moved)", priority: 3, completed: false });
    assert.equal(r.body.task.dueDate, "2026-10-25");
    assert.equal(r.body.task.completedAt, null);
    assert.equal((await api().patch(`/api/calendar/${id}`).set(a).send({ priority: 9 })).status, 400);
  });
  it("another account cannot see, edit or delete these tasks", async () => {
    assert.equal((await api().get("/api/calendar").set(b)).body.items.length, 0);
    assert.equal((await api().patch(`/api/calendar/${id}`).set(b).send({ title: "hacked" })).status, 404);
    assert.equal((await api().delete(`/api/calendar/${id}`).set(b)).status, 404);
    assert.equal((await api().delete("/api/calendar/not-an-id").set(a)).status, 404);
  });
  it("tasks survive logout and login (stored in the database)", async () => {
    await api().post("/api/auth/logout").set(a);
    stores.users.updateOne({ email: "u1@example.com" } as any, { $set: { lastLogoutAt: null } } as any);
    const login = await api().post("/api/auth/login").send({ email: "u1@example.com", password: "Secret123" });
    assert.equal(login.status, 200);
    const again = { Cookie: cookieOf(login), ...CSRF };
    assert.equal((await api().get("/api/calendar").set(again)).body.items.length, 4);
    assert.equal((await api().delete(`/api/calendar/${id}`).set(again)).status, 200);
    assert.equal((await api().get("/api/calendar").set(again)).body.items.length, 3);
  });
});

describe("live weather (Open-Meteo)", () => {
  it("searches places and returns forecast + rule-based insights", async () => {
    assert.equal((await api().get("/api/weather/search?q=L")).status, 400);
    assert.equal((await api().get("/api/weather/search?q=Ludhiana")).body.places[0].name, "Ludhiana");
    const r = await api().get("/api/weather?lat=30.9&lon=75.85");
    assert.equal(r.status, 200);
    assert.equal(r.body.forecast.current.temperature, 31);
    assert.equal(r.body.forecast.current.icon, "⛅");
    assert.equal(r.body.forecast.daily.length, 7);
    const ids = r.body.insights.map((i: any) => i.id);
    assert.deepEqual(ids, ["heat", "frost", "rain", "wind", "irrigation"]);
    assert.equal(r.body.insights[0].level, "watch"); // 36°C ≥ 35
    assert.match(r.body.note, /not guaranteed/);
    assert.equal((await api().get("/api/weather?lat=999&lon=1")).status, 400);
  });
});

describe("water management (FAO-56)", () => {
  it("kc follows the four growth stages", () => {
    const c = CROPS.wheat;
    assert.equal(kcFor(c, 5).kc, c.kcIni);
    assert.equal(kcFor(c, 80).kc, c.kcMid);
    assert.ok(kcFor(c, 120).kc < c.kcMid && kcFor(c, 120).kc > c.kcEnd);
    assert.equal(kcFor(c, 9999).kc, c.kcEnd);
  });
  it("schedules irrigation only when depletion reaches the allowed level, and respects rain", () => {
    const days = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${12 + i}`, code: 1, tmax: 30, tmin: 15, rain: 0, rainProb: 0, et0: 5, windMax: 10 }));
    const dry = plan({ crop: "wheat", soil: "loam", stageDay: 80, moisturePct: 50, days, today: "2026-10-12" });
    assert.ok(dry.nextIrrigation, "dry week → irrigation needed");
    assert.ok(dry.weekNetMm > 0);
    const wet = plan({ crop: "wheat", soil: "loam", stageDay: 80, moisturePct: 90, days: days.map((d) => ({ ...d, rain: 30 })), today: "2026-10-12" });
    assert.equal(wet.nextIrrigation, null);
    assert.ok(dry.assumptions.length >= 3);
    const noInfo = plan({ crop: "rice", soil: "clay", days, today: "2026-10-12" });
    assert.ok(noInfo.assumptions.some((a) => /No planting date/.test(a)));
    assert.ok(noInfo.assumptions.some((a) => /No soil-moisture/.test(a)));
    assert.throws(() => plan({ crop: "x", soil: "loam", days, today: "2026-10-12" }));
  });
  it("POST /api/water/plan validates input and uses forecast ET0", async () => {
    const body = { crop: "maize", soil: "sandy_loam", lat: 30.9, lon: 75.85, plantingDate: "2026-09-20", method: "drip" };
    const r = await api().post("/api/water/plan").send(body);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.plan.days.length, 7);
    assert.match(r.body.disclaimer, /not a measurement/);
    assert.equal((await api().post("/api/water/plan").send({ ...body, crop: "unicorn" })).status, 400);
    assert.equal((await api().post("/api/water/plan").send({ ...body, moisturePct: 140 })).status, 400);
    assert.equal((await api().get("/api/water/options")).body.crops.length, Object.keys(CROPS).length);
  });
});

describe("products catalog (30 records)", () => {
  const file = path.join(cfg.dataDir, "products.json");
  it("products.json has 30 valid, unique records with direct https purchase links", () => {
    const { products, rejected } = loadProducts(file);
    assert.deepEqual(rejected, []);
    assert.equal(products.length, 30);
    for (const p of products) {
      assert.match(p.purchaseUrl, /^https:\/\//);
      assert.ok(new URL(p.purchaseUrl).pathname.length > 1, `${p.id} must link to a product page, not a homepage`);
      if (p.price !== null) assert.ok(p.currency, `${p.id} price needs a currency`);
    }
  });
  it("API supports search + category filtering, details, and drops invalid future records", async () => {
    const all = (await api().get("/api/products")).body;
    assert.equal(all.total, 30);
    assert.ok(all.categories.length >= 8);
    const cat = all.categories[0].name;
    assert.ok((await api().get(`/api/products?category=${encodeURIComponent(cat)}`)).body.items.every((p: any) => p.category === cat));
    const q = (await api().get("/api/products?q=zzzz-nothing")).body;
    assert.equal(q.items.length, 0);
    const one = all.items[0];
    assert.equal((await api().get(`/api/products/${one.id}`)).body.product.id, one.id);
    assert.equal((await api().get("/api/products/nope")).status, 404);
  });
});

describe("farming resources", () => {
  it("lists official schemes with filters and a caution note", async () => {
    const r = (await api().get("/api/resources/schemes")).body;
    assert.ok(r.total >= 10);
    assert.ok(r.items.every((s: any) => s.officialUrl.startsWith("http")));
    assert.ok(r.items.some((s: any) => s.level === "central") && r.items.some((s: any) => s.level === "state"));
    assert.ok((await api().get("/api/resources/schemes?level=state")).body.items.every((s: any) => s.level === "state"));
    assert.match(r.note, /official page/);
  });
  it("parses RSS safely (drops non-http links, strips HTML)", () => {
    const items = parseFeed(feedXml, "Test");
    assert.equal(items.length, 1);
    assert.equal(items[0].summary, "Sowing up");
    assert.equal(items[0].link, "https://example.org/a");
  });
});

describe("contact form", () => {
  it("validates, stores, forwards by e-mail, ignores bots and is rate limited", async () => {
    const ok = { name: "Farmer Joe", email: "Joe@Example.com", subject: "Question", message: "Hello, I have a question about CropNexus." };
    assert.equal((await api().post("/api/contact").send({ ...ok, email: "bad" })).status, 400);
    assert.equal((await api().post("/api/contact").send({ ...ok, message: "short" })).status, 400);
    const r = await api().post("/api/contact").send(ok);
    assert.equal(r.status, 201);
    const doc: any = await stores.contacts.findOne({ email: "joe@example.com" });
    assert.equal(doc.emailed, true);
    assert.ok(mails.some((m) => m.startsWith("owner@example.com|")));
    const bot = await api().post("/api/contact").send({ ...ok, email: "bot@example.com", website: "http://spam" });
    assert.equal(bot.status, 200);
    assert.equal(await stores.contacts.findOne({ email: "bot@example.com" }), null);
    assert.equal((await api().post("/api/contact").send(ok)).status, 429); // 4 per hour in this test config
  });
  it("only publishes developer details that were configured", async () => {
    const info = (await api().get("/api/contact/info")).body;
    assert.equal(info.developerName, null);
    assert.equal(info.developerPhone, null);
  });
});

describe("soil health", () => {
  let a: Record<string, string>;
  it("is protected and validates input", async () => {
    assert.equal((await api().post("/api/soil/analyze")).status, 401);
    a = await newUser(3);
    assert.equal((await api().post("/api/soil/analyze").set(a).send({})).status, 400); // nothing supplied
    assert.equal((await api().post("/api/soil/analyze").set(a).send({ ph: 20 })).status, 400);
    assert.equal((await api().post("/api/soil/analyze").set(a).send({ nitrogen: "abc" })).status, 400);
  });
  it("rates typed-in measurements separately from the photo", async () => {
    const r = await api().post("/api/soil/analyze").set(a).send({ nitrogen: 200, ph: 6.8, potassium: "" });
    assert.equal(r.status, 200);
    assert.equal(r.body.image, null);
    assert.deepEqual(r.body.measurements.ratings.map((x: any) => x.parameter), ["nitrogen", "ph"]);
  });
  it("classifies a photo when the model exists, and says so honestly when it does not", async () => {
    const img = { filename: "s.jpg", contentType: "image/jpeg" };
    let r = await api().post("/api/soil/analyze").set(a).attach("soil_image", Buffer.from("x"), img);
    assert.equal(r.body.image.top_predictions[0].class, "Black_Soil");
    photoModel = false;
    r = await api().post("/api/soil/analyze").set(a).attach("soil_image", Buffer.from("x"), img);
    assert.equal(r.status, 503);
    assert.equal(r.body.code, "MODEL_UNAVAILABLE");
    r = await api().post("/api/soil/analyze").set(a).field("ph", "6.5").attach("soil_image", Buffer.from("x"), img);
    assert.equal(r.status, 200); // measurements still answered
    assert.match(r.body.imageError, /not been trained/);
    assert.equal((await api().post("/api/soil/analyze").set(a).attach("soil_image", Buffer.from("x"), { filename: "a.gif", contentType: "image/gif" })).status, 400);
    photoModel = true;
  });
});
