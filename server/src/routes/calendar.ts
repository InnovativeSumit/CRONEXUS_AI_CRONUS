import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import type { Config } from "../config.js";
import type { Stores } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import type { TaskDoc } from "../types.js";
import { zodMessage } from "../validators.js";

export const CATEGORIES = ["sowing", "irrigation", "fertilization", "pesticide", "harvesting", "maintenance", "other"] as const;
const MAX_TASKS = 2000;

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z")) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
const date = z.string().refine(isDate, "Enter a valid date (YYYY-MM-DD).");
const priority = z.coerce.number().refine((p) => p === 1 || p === 2 || p === 3, "Priority must be 1, 2 or 3.").transform((p) => p as 1 | 2 | 3);

const createSchema = z.object({
  title: z.string().trim().min(1, "Enter a task title.").max(120, "Title is too long (max 120 characters)."),
  description: z.string().trim().max(2000, "Description is too long.").optional().default(""),
  dueDate: date,
  priority,
  category: z.enum(CATEGORIES).optional().default("other"),
});
const patchSchema = z.object({
  title: z.string().trim().min(1, "Enter a task title.").max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  dueDate: date.optional(),
  priority: priority.optional(),
  category: z.enum(CATEGORIES).optional(),
  completed: z.boolean().optional(),
});
const listSchema = z.object({
  status: z.enum(["all", "open", "done", "overdue", "upcoming"]).optional().default("all"),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  from: date.optional(),
  to: date.optional(),
  today: date.optional(),
});

const view = (t: TaskDoc, today: string) => ({
  id: String(t._id), title: t.title, description: t.description, dueDate: t.dueDate, priority: t.priority, category: t.category,
  completed: t.completed, completedAt: t.completedAt, overdue: !t.completed && t.dueDate < today, createdAt: t.createdAt,
});

/** Every query is scoped to the signed-in user (userId from the verified session, never from the request). */
export function calendarRouter(cfg: Config, stores: Stores) {
  const r = Router();
  const { tasks } = stores;
  r.use(requireAuth(cfg, stores));

  r.get("/", async (req, res) => {
    const q = listSchema.safeParse(req.query);
    if (!q.success) return res.status(400).json(zodMessage(q.error));
    const { status, priority: pr, from, to } = q.data;
    const today = q.data.today ?? new Date().toISOString().slice(0, 10);
    const rows = await tasks.find({ userId: req.user!._id }).sort({ dueDate: 1 }).limit(MAX_TASKS).toArray();
    const out = rows
      .filter((t) => (pr ? t.priority === pr : true) && (from ? t.dueDate >= from : true) && (to ? t.dueDate <= to : true))
      .filter((t) => status === "all" || (status === "open" && !t.completed) || (status === "done" && t.completed) || (status === "overdue" && !t.completed && t.dueDate < today) || (status === "upcoming" && !t.completed && t.dueDate >= today))
      .sort((a, b) => (a.dueDate === b.dueDate ? a.priority - b.priority : a.dueDate < b.dueDate ? -1 : 1))
      .map((t) => view(t, today));
    const all = rows.map((t) => view(t, today));
    res.json({
      items: out,
      summary: { total: all.length, open: all.filter((t) => !t.completed).length, done: all.filter((t) => t.completed).length, overdue: all.filter((t) => t.overdue).length, dueToday: all.filter((t) => !t.completed && t.dueDate === today).length },
      today,
    });
  });

  r.post("/", async (req, res) => {
    const p = createSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json(zodMessage(p.error));
    if ((await tasks.countDocuments({ userId: req.user!._id })) >= MAX_TASKS) return res.status(409).json({ error: `You have reached the limit of ${MAX_TASKS} tasks. Delete completed tasks first.`, code: "TASK_LIMIT" });
    const now = new Date();
    const doc: TaskDoc = { userId: req.user!._id, ...p.data, completed: false, completedAt: null, createdAt: now, updatedAt: now };
    const { insertedId } = await tasks.insertOne(doc);
    res.status(201).json({ task: view({ ...doc, _id: insertedId }, new Date().toISOString().slice(0, 10)) });
  });

  const owned = async (req: any) => {
    if (!ObjectId.isValid(String(req.params.id))) return null;
    return tasks.findOne({ _id: new ObjectId(String(req.params.id)), userId: req.user!._id });
  };

  r.patch("/:id", async (req, res) => {
    const p = patchSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json(zodMessage(p.error));
    const t = await owned(req);
    if (!t) return res.status(404).json({ error: "Task not found." });
    const set: Partial<TaskDoc> = { ...p.data, updatedAt: new Date() };
    if (p.data.completed !== undefined) set.completedAt = p.data.completed ? new Date() : null;
    await tasks.updateOne({ _id: t._id, userId: req.user!._id }, { $set: set });
    res.json({ task: view({ ...t, ...set } as TaskDoc, new Date().toISOString().slice(0, 10)) });
  });

  r.delete("/:id", async (req, res) => {
    const t = await owned(req);
    if (!t) return res.status(404).json({ error: "Task not found." });
    await tasks.deleteOne({ _id: t._id, userId: req.user!._id });
    res.json({ ok: true });
  });

  return r;
}
