import { Router } from "express";
import { z } from "zod";
import type { Http } from "../services/http.js";
import { agroInsights, describeCode, getForecast, searchPlaces } from "../services/weather.js";
import { zodMessage } from "../validators.js";

const coords = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) });

export function weatherRouter(http: Http) {
  const r = Router();
  r.get("/search", async (req, res) => {
    const q = z.object({ q: z.string().trim().min(2, "Type at least 2 characters.").max(80) }).safeParse(req.query);
    if (!q.success) return res.status(400).json(zodMessage(q.error));
    res.json({ places: await searchPlaces(http, q.data.q), attribution: "Geocoding by Open-Meteo.com" });
  });
  r.get("/", async (req, res) => {
    const c = coords.safeParse(req.query);
    if (!c.success) return res.status(400).json(zodMessage(c.error));
    const { forecast, cached, stale } = await getForecast(http, c.data.lat, c.data.lon);
    res.json({
      forecast: {
        ...forecast,
        current: { ...forecast.current, ...describeCode(forecast.current.code ?? -1) },
        daily: forecast.daily.map((d) => ({ ...d, ...describeCode(d.code) })),
      },
      insights: agroInsights(forecast.daily),
      cached, stale,
      note: "Agricultural indicators are simple rule-based estimates from the forecast, not guaranteed predictions.",
    });
  });
  return r;
}
