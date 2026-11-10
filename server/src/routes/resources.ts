import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import type { Config } from "../config.js";
import { TtlCache, type Http } from "../services/http.js";
import { parseFeed, type NewsItem } from "../services/rss.js";

const scheme = z.object({
  id: z.string(), name: z.string(), level: z.enum(["central", "state"]), state: z.string(), type: z.string(), description: z.string().nullable().default(null),
  eligibility: z.string().nullable().default(null), benefits: z.string().nullable().default(null), howToApply: z.string().nullable().default(null),
  officialUrl: z.string().url(), sourceName: z.string().nullable().default(null), status: z.enum(["active", "unconfirmed", "closed"]), lastVerified: z.string().nullable().default(null), imageUrl: z.string().url().nullable().default(null),
});
const source = z.object({ id: z.string(), name: z.string(), feedUrl: z.string().url(), siteUrl: z.string().url().nullable().default(null), language: z.string().default("en"), note: z.string().nullable().default(null) });

const readJson = <T,>(file: string, s: z.ZodType<T>): T[] => {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return (Array.isArray(raw) ? raw : []).flatMap((r) => { const p = s.safeParse(r); return p.success ? [p.data] : []; });
  } catch { return []; }
};

export function resourcesRouter(cfg: Config, http: Http) {
  const r = Router();
  const news = new TtlCache<{ items: NewsItem[]; failed: string[]; fetchedAt: string }>(30 * 60_000, 4);

  r.get("/schemes", (req, res) => {
    const all = readJson(path.join(cfg.dataDir, "schemes.json"), scheme);
    const q = String(req.query.q ?? "").trim().toLowerCase().slice(0, 80), level = String(req.query.level ?? ""), type = String(req.query.type ?? "");
    const items = all.filter((s) => (!level || s.level === level) && (!type || s.type === type) && (!q || [s.name, s.description ?? "", s.state, s.type].join(" ").toLowerCase().includes(q)));
    res.json({
      items, total: all.length, types: [...new Set(all.map((s) => s.type))].sort(),
      note: "Eligibility and benefits depend on state, landholding and category. Always confirm on the official page before applying; nothing here is an offer or guarantee.",
    });
  });

  r.get("/news", async (req, res) => {
    const sources = readJson(path.join(cfg.dataDir, "news_sources.json"), source);
    if (!sources.length) return res.json({ items: [], sources: [], failed: [], fetchedAt: null, note: "No news feeds are configured. Add verified RSS feeds to server/data/news_sources.json." });
    let hit = news.get("all");
    if (!hit) {
      const failed: string[] = [];
      const results = await Promise.all(sources.map(async (s) => {
        try { return parseFeed(await http.getText(s.feedUrl, { timeoutMs: 10_000 }), s.name); } catch { failed.push(s.name); return []; }
      }));
      const items = results.flat().sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
      if (items.length || !news.stale("all")) news.set("all", { items, failed, fetchedAt: new Date().toISOString() });
      hit = { value: news.stale("all")!.value, ageMs: 0 };
    }
    const q = String(req.query.q ?? "").trim().toLowerCase().slice(0, 80);
    const items = hit.value.items.filter((n) => !q || (n.title + " " + n.summary).toLowerCase().includes(q)).slice(0, 60);
    res.json({ items, sources: sources.map((s) => ({ name: s.name, siteUrl: s.siteUrl, note: s.note })), failed: hit.value.failed, fetchedAt: hit.value.fetchedAt });
  });
  return r;
}
