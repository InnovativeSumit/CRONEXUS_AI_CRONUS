import { Router } from "express";
import { ObjectId } from "mongodb";
import type { Config } from "../config.js";
import type { Stores } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { feedbackSchema, zodMessage } from "../validators.js";

const MAX_PER_ACCOUNT = 2;

export function feedbackRouter(cfg: Config, stores: Stores) {
  const r = Router();
  const auth = requireAuth(cfg, stores);
  const { feedback, users } = stores;

  // Public: real, published reviews only (shown on the landing page)
  r.get("/", async (_req, res) => {
    const rows = await feedback.find({ status: "published" }).sort({ createdAt: -1 }).limit(500).toArray();
    const items = await Promise.all(
      rows.slice(0, 12).map(async (f) => {
        const u = await users.findOne({ _id: f.userId });
        return { id: String(f._id), name: f.name, text: f.text, rating: f.rating, createdAt: f.createdAt, avatar: u?.avatar ?? null };
      })
    );
    const average = rows.length ? Math.round((rows.reduce((n, f) => n + f.rating, 0) / rows.length) * 10) / 10 : null;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const f of rows) distribution[f.rating]++;
    res.json({ items, count: rows.length, average, distribution });
  });

  // The signed-in user's own entries + how many they have left
  r.get("/mine", auth, async (req, res) => {
    const mine = await feedback.find({ userId: req.user!._id }).sort({ createdAt: -1 }).limit(10).toArray();
    res.json({
      items: mine.map((f) => ({ id: String(f._id), name: f.name, text: f.text, rating: f.rating, status: f.status, createdAt: f.createdAt })),
      remaining: Math.max(0, MAX_PER_ACCOUNT - mine.length),
      max: MAX_PER_ACCOUNT,
    });
  });

  r.post("/", auth, async (req, res) => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodMessage(parsed.error));
    const limitMsg = `You have already submitted the maximum of ${MAX_PER_ACCOUNT} feedback entries.`;
    if ((await feedback.countDocuments({ userId: req.user!._id })) >= MAX_PER_ACCOUNT) return res.status(409).json({ error: limitMsg, code: "FEEDBACK_LIMIT" });

    const doc = { userId: req.user!._id, ...parsed.data, status: cfg.feedbackAutoPublish ? ("published" as const) : ("pending" as const), createdAt: new Date() };
    const { insertedId } = await feedback.insertOne(doc);
    // guard against two simultaneous requests slipping past the count above
    const all = await feedback.find({ userId: req.user!._id }).sort({ createdAt: 1 }).limit(10).toArray();
    if (all.length > MAX_PER_ACCOUNT) {
      await feedback.deleteOne({ _id: insertedId });
      return res.status(409).json({ error: limitMsg, code: "FEEDBACK_LIMIT" });
    }
    res.status(201).json({ ok: true, status: doc.status, remaining: MAX_PER_ACCOUNT - all.length });
  });

  // Users can delete their own feedback (it disappears from the landing page too). Deleting frees one of the 2 slots.
  r.delete("/:id", auth, async (req, res) => {
    if (!ObjectId.isValid(String(req.params.id))) return res.status(400).json({ error: "Invalid id." });
    const mine = await feedback.findOne({ _id: new ObjectId(String(req.params.id)), userId: req.user!._id });
    if (!mine) return res.status(404).json({ error: "Feedback not found." });
    await feedback.deleteOne({ _id: mine._id, userId: req.user!._id });
    res.json({ ok: true });
  });

  // Optional moderation (only for e-mails listed in ADMIN_EMAILS): PATCH /api/feedback/:id {"status":"published"|"rejected"|"pending"}
  r.patch("/:id", auth, async (req, res) => {
    if (!cfg.adminEmails.includes(req.user!.email)) return res.status(403).json({ error: "Not allowed." });
    const status = req.body?.status;
    if (!["published", "pending", "rejected"].includes(status) || !ObjectId.isValid(String(req.params.id))) return res.status(400).json({ error: "Invalid request." });
    await feedback.updateOne({ _id: new ObjectId(String(req.params.id)) }, { $set: { status } });
    res.json({ ok: true });
  });

  return r;
}
