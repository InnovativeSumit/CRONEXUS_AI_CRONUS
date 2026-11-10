import { Router } from "express";
import { z } from "zod";
import type { Http } from "../services/http.js";
import { CROPS, plan, SOILS } from "../services/water.js";
import { getForecast, ATTRIBUTION } from "../services/weather.js";
import { zodMessage } from "../validators.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const planSchema = z.object({
  crop: z.string().refine((c) => c in CROPS, "Choose a supported crop."),
  soil: z.string().refine((s) => s in SOILS, "Choose a soil type."),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  plantingDate: isoDate.optional(),
  stageDay: z.coerce.number().int().min(1).max(400).optional(),
  moisturePct: z.coerce.number().min(0).max(100).optional(),
  method: z.enum(["flood", "sprinkler", "drip"]).optional().default("sprinkler"),
  today: isoDate.optional(),
});

export function waterRouter(http: Http) {
  const r = Router();
  r.get("/options", (_req, res) => res.json({
    crops: Object.entries(CROPS).map(([id, c]) => ({ id, name: c.name, cycleDays: c.stages.reduce((a, b) => a + b, 0) })),
    soils: Object.entries(SOILS).map(([id, s]) => ({ id, name: s.name })),
    methods: ["flood", "sprinkler", "drip"],
  }));
  r.post("/plan", async (req, res) => {
    const p = planSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json(zodMessage(p.error));
    const { forecast, stale } = await getForecast(http, p.data.lat, p.data.lon);
    const missing = forecast.daily.filter((d) => d.et0 === null).length;
    if (missing === forecast.daily.length) return res.status(502).json({ error: "The weather provider returned no evapotranspiration data for this location.", code: "NO_ET0" });
    const today = p.data.today ?? forecast.daily[0].date;
    const result = plan({ crop: p.data.crop, soil: p.data.soil, plantingDate: p.data.plantingDate, stageDay: p.data.stageDay, moisturePct: p.data.moisturePct, method: p.data.method, days: forecast.daily, today });
    res.json({
      plan: result, stale, fetchedAt: forecast.fetchedAt, attribution: ATTRIBUTION,
      disclaimer: "Estimate based on the FAO-56 crop-coefficient method and a forecast; it is not a measurement of actual field moisture. Verify with a soil-moisture reading before irrigating.",
      references: [
        { title: "FAO Irrigation and Drainage Paper 56 — Crop Evapotranspiration", url: "https://www.fao.org/4/x0490e/x0490e00.htm" },
        { title: "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)", url: "https://pmksy.gov.in/" },
      ],
    });
  });
  return r;
}
