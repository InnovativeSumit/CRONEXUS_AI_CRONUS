import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { Config } from "../config.js";
import type { Stores } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { MlError, type MlClient } from "../services/ml.js";
import { zodMessage } from "../validators.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const opt = (min: number, max: number, label: string) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.number({ error: `${label} must be a number.` }).min(min, `${label} must be ≥ ${min}.`).max(max, `${label} must be ≤ ${max}.`).optional());
const measurements = z.object({
  nitrogen: opt(0, 2000, "Nitrogen"), phosphorus: opt(0, 500, "Phosphorus"), potassium: opt(0, 2000, "Potassium"),
  organic_carbon: opt(0, 20, "Organic carbon"), ph: opt(0, 14, "pH"), ec: opt(0, 50, "EC"),
});

/**
 * Soil Health Analysis. Two independent inputs, both optional (at least one required):
 *   - a soil PHOTO  → TensorFlow model predicts broad soil type (only if the model has been trained)
 *   - soil-test VALUES → rule-based ratings (never inferred from the photo)
 */
export function soilRouter(cfg: Config, stores: Stores, ml: MlClient) {
  const r = Router();
  r.use(requireAuth(cfg, stores));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

  r.get("/status", async (_req, res) => {
    try { res.json(await ml.soilStatus()); } catch (e) {
      if (e instanceof MlError) return res.json({ image_model_available: false, metrics: null, how_to_train: "python download_soil_dataset.py && python train_soil_model.py", error: e.message });
      throw e;
    }
  });

  r.post("/analyze", upload.single("soil_image"), async (req, res) => {
    const m = measurements.safeParse(req.body);
    if (!m.success) return res.status(400).json(zodMessage(m.error));
    const values = Object.fromEntries(Object.entries(m.data).filter(([, v]) => v !== undefined));
    const file = req.file;
    if (!file && !Object.keys(values).length) return res.status(400).json({ error: "Add a soil photo, enter at least one soil-test value, or both." });
    if (file && !ALLOWED.has(file.mimetype)) return res.status(400).json({ error: "Unsupported file type. Please upload a JPG, PNG or WEBP image." });

    const out: { image: unknown; measurements: unknown; imageError?: string } = { image: null, measurements: null };
    if (file) {
      try { out.image = await ml.soilPhoto(file); } catch (e) {
        if (e instanceof MlError && (e.status === 503 || e.status === 400 || e.status === 413)) {
          if (!Object.keys(values).length) return res.status(e.status).json({ error: e.message, code: e.status === 503 ? "MODEL_UNAVAILABLE" : undefined });
          out.imageError = e.message; // keep going: the measurements part can still be answered
        } else throw e;
      }
    }
    if (Object.keys(values).length) out.measurements = await ml.soilAssess(values);
    await stores.history.insertOne({
      userId: req.user!._id, type: "soil", createdAt: new Date(),
      inputs: values as Record<string, number>,
      soil_type: (out.image as any)?.top_predictions?.[0]?.label,
    });
    res.json(out);
  });
  return r;
}
