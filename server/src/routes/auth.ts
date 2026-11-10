import crypto from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import type { Config } from "../config.js";
import type { Stores } from "../db.js";
import { clearSessionCookie, publicUser, requireAuth, setSessionCookie } from "../middleware/auth.js";
import { bus, STATS_CHANGED } from "../services/events.js";
import { DeliveryError, type Notifier } from "../services/notify.js";
import type { UserDoc } from "../types.js";
import { ageGroupOf } from "../profile.js";
import { forgotSchema, loginSchema, parsePhone, resetSchema, signupSchema, zodMessage } from "../validators.js";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
// A real bcrypt hash of a random string, compared against when the e-mail is unknown
// so response time doesn't reveal which e-mails are registered.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 4);

export function authRouter(cfg: Config, stores: Stores, notifier: Notifier) {
  const r = Router();
  const { users, events } = stores;
  const auth = requireAuth(cfg, stores);

  // Tighter limiter for anything that sends a message or creates accounts (abuse / spam protection)
  const sendLimiter = rateLimit({
    windowMs: 15 * 60_000, limit: cfg.sendRateLimitMax, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  });
  const signupLimiter = sendLimiter;
  r.get("/config", (_req, res) => res.json({ emailDelivery: notifier.emailMode, loginCooldownSeconds: cfg.loginCooldownSeconds }));

  // ---- Sign up (no e-mail/SMS verification step) ---------------------------
  r.post("/signup", signupLimiter, async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodMessage(parsed.error));
    const { name, age, email, country, password } = parsed.data;
    const phone = parsePhone(parsed.data.phone, country)!;

    if (await users.findOne({ email })) {
      return res.status(409).json({ error: "An account with that email already exists.", fields: { email: "Email already registered." } });
    }
    if (await users.findOne({ phone: phone.e164 })) {
      return res.status(409).json({ error: "An account with that mobile number already exists.", fields: { phone: "Mobile number already registered." } });
    }

    const now = new Date();
    const doc: Omit<UserDoc, "_id"> = {
      name, email, phone: phone.e164, country: phone.country,
      emailVerified: false, phoneVerified: false,
      age, ageGroup: ageGroupOf(age), avatar: null,
      passwordHash: await bcrypt.hash(password, cfg.bcryptRounds), // never store the plaintext
      createdAt: now, updatedAt: now, lastLoginAt: now, lastSeenAt: now, lastLogoutAt: null,
      isOnline: true, loginCount: 1, tokenVersion: 0, failedLogins: 0, lockUntil: null,
    };
    let inserted;
    try {
      inserted = await users.insertOne(doc as UserDoc);
    } catch (e: any) {
      if (e?.code === 11000) return res.status(409).json({ error: "An account with that email already exists.", fields: { email: "Email already registered." } });
      throw e;
    }
    const user = { ...doc, _id: inserted.insertedId } as UserDoc;
    await events.insertMany([
      { userId: user._id, type: "signup", at: now },
      { userId: user._id, type: "login", at: now },
    ]);
    bus.emit(STATS_CHANGED);
    setSessionCookie(cfg, res, user);
    res.status(201).json({ user: publicUser(user) });
  });

  // ---- Log in (lock-out after repeated failures + post-logout cooldown) ----
  r.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodMessage(parsed.error));
    const { email, password } = parsed.data;

    const user = await users.findOne({ email });
    if (user?.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
      const retryAfterSeconds = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: "Too many failed attempts. This account is temporarily locked. Try again later or reset your password.", code: "ACCOUNT_LOCKED", retryAfterSeconds });
    }
    const hash = user?.passwordHash ?? user?.password ?? DUMMY_HASH; // `password` = legacy Flask field (also bcrypt)
    const ok = await bcrypt.compare(password, hash);
    if (!user || !ok) {
      if (user) {
        const fails = (user.failedLogins ?? 0) + 1;
        const lock = fails >= cfg.maxFailedLogins;
        await users.updateOne({ _id: user._id }, { $set: { failedLogins: lock ? 0 : fails, lockUntil: lock ? new Date(Date.now() + cfg.lockoutMinutes * 60_000) : null } });
      }
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    if (user.lastLogoutAt) {
      const elapsed = (Date.now() - new Date(user.lastLogoutAt).getTime()) / 1000;
      if (elapsed < cfg.loginCooldownSeconds) {
        const retryAfterSeconds = Math.ceil(cfg.loginCooldownSeconds - elapsed);
        res.setHeader("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({
          error: `You logged out recently. Please wait ${retryAfterSeconds}s before logging in again.`,
          code: "LOGIN_COOLDOWN", retryAfterSeconds, cooldownSeconds: cfg.loginCooldownSeconds,
        });
      }
    }

    const now = new Date();
    await users.updateOne({ _id: user._id }, { $set: { lastLoginAt: now, lastSeenAt: now, isOnline: true, updatedAt: now, failedLogins: 0, lockUntil: null }, $inc: { loginCount: 1 } });
    await events.insertOne({ userId: user._id, type: "login", at: now });
    bus.emit(STATS_CHANGED);
    const fresh = { ...user, lastLoginAt: now, isOnline: true };
    setSessionCookie(cfg, res, fresh);
    res.json({ user: publicUser(fresh) });
  });

  // ---- Log out (revokes the session + starts the cooldown) ----------------
  r.post("/logout", auth, async (req, res) => {
    const now = new Date();
    await users.updateOne(
      { _id: req.user!._id },
      { $set: { isOnline: false, lastLogoutAt: now, updatedAt: now }, $inc: { tokenVersion: 1 } } // revokes existing sessions
    );
    await events.insertOne({ userId: req.user!._id, type: "logout", at: now });
    bus.emit(STATS_CHANGED);
    clearSessionCookie(cfg, res);
    res.json({ ok: true, cooldownSeconds: cfg.loginCooldownSeconds });
  });

  r.get("/me", auth, (req, res) => res.json({ user: publicUser(req.user!) }));

  // ---- Forgot / reset password (link sent by e-mail; never returned in the response) ----
  r.post("/forgot-password", sendLimiter, async (req, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodMessage(parsed.error));
    const generic = { ok: true, message: "If that email is registered, a password reset link has been sent." };

    const user = await users.findOne({ email: parsed.data.email });
    if (!user) return res.json(generic);
    if (user.resetRequestedAt && Date.now() - new Date(user.resetRequestedAt).getTime() < 60_000) return res.json(generic);

    const token = crypto.randomBytes(32).toString("hex");
    const link = `${cfg.clientOrigins[0]}/reset-password?token=${token}`;
    try {
      await notifier.sendEmail(
        user.email,
        "Reset your CropNexus password",
        `Hello ${user.name},\n\nUse this link to choose a new password (valid for ${cfg.resetTokenMinutes} minutes):\n${link}\n\nIf you did not ask for this, you can ignore this e-mail.`,
        `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto"><h2 style="color:#15803d">CropNexus</h2><p>Hello ${user.name.replace(/[<>&]/g, "")},</p><p><a href="${link}" style="background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Choose a new password</a></p><p>The link is valid for ${cfg.resetTokenMinutes} minutes. If you did not ask for this, ignore this e-mail.</p></div>`
      );
    } catch (e) {
      if (e instanceof DeliveryError) return res.status(e.status).json({ error: e.message, code: "DELIVERY_FAILED" });
      throw e;
    }
    await users.updateOne(
      { _id: user._id },
      { $set: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + cfg.resetTokenMinutes * 60_000), resetRequestedAt: new Date() } }
    );
    res.json(generic);
  });

  r.post("/reset-password", sendLimiter, async (req, res) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodMessage(parsed.error));
    const { token, password } = parsed.data;

    const user = await users.findOne({ resetTokenHash: sha256(token) });
    if (!user || !user.resetTokenExpires || new Date(user.resetTokenExpires).getTime() < Date.now()) {
      return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    }
    await users.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash: await bcrypt.hash(password, cfg.bcryptRounds), resetTokenHash: null, resetTokenExpires: null, isOnline: false, updatedAt: new Date(), failedLogins: 0, lockUntil: null },
        $inc: { tokenVersion: 1 },
      }
    );
    bus.emit(STATS_CHANGED);
    clearSessionCookie(cfg, res);
    res.json({ ok: true, message: "Password updated. You can now log in." });
  });

  return r;
}
