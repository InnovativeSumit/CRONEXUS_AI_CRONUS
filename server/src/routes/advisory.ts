import { Router } from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import type { Config } from "../config.js";
import type { Stores } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import type { MlClient } from "../services/ml.js";
import { advisorySchema, zodMessage } from "../validators.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function advisoryRouter(cfg: Config, stores: Stores, ml: MlClient) {
  const r = Router();
  const auth = requireAuth(cfg, stores);
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

  r.post("/advisory", auth, async (req, res) => {
    const parsed = advisorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodMessage(parsed.error));
    const result = await ml.crop(parsed.data);
    await stores.history.insertOne({
      userId: req.user!._id,
      type: "crop",
      createdAt: new Date(),
      location: parsed.data.location,
      soil_type: parsed.data.soil_type,
      inputs: result.inputs,
      top_crops: result.top_crops,
      recommended_crop: result.recommended_crop,
    });
    res.json(result);
  });

  r.post("/leaf-disease", auth, upload.single("leaf_image"), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Please choose a leaf image to upload." });
    if (!ALLOWED.has(file.mimetype)) return res.status(400).json({ error: "Unsupported file type. Please upload a JPG, PNG or WEBP image." });
    const result = await ml.leaf(file);
    await stores.history.insertOne({
      userId: req.user!._id,
      type: "leaf",
      createdAt: new Date(),
      top_predictions: result.top_predictions,
      disease_name: result.info?.disease_name,
    });
    res.json(result);
  });

  r.get("/history", auth, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const rows = await stores.history.find({ userId: req.user!._id }).sort({ createdAt: -1 }).limit(limit).toArray();
    res.json(rows.map(({ _id, userId, createdAt, ...rest }) => ({ id: String(_id), timestamp: createdAt, ...rest })));
  });

  r.delete("/history/:id", auth, async (req, res) => {
    if (!ObjectId.isValid(String(req.params.id))) return res.status(400).json({ error: "Invalid id." });
    await stores.history.deleteOne({ _id: new ObjectId(String(req.params.id)), userId: req.user!._id });
    res.json({ ok: true });
  });

  r.get("/model-info", auth, async (_req, res) => res.json(await ml.modelInfo()));

  return r;
}
