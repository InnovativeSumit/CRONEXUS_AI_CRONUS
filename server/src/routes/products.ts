import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import type { Config } from "../config.js";

const url = z.string().url().refine((u) => /^https?:\/\//.test(u), "Must be http(s)");
export const productSchema = z.object({
  id: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().min(5),
  imageUrl: url.nullable().default(null),
  manufacturer: z.string().nullable().default(null),
  seller: z.string().nullable().default(null),
  price: z.number().positive().nullable().default(null),
  currency: z.string().length(3).nullable().default(null),
  purchaseUrl: url,
  sourceUrl: url.nullable().default(null),
  verifiedAt: z.string().nullable().default(null),
  imageVerified: z.boolean().default(false),
});
export type Product = z.infer<typeof productSchema>;

/** Reads + validates products.json. Invalid records are skipped (and reported) so catalog additions can never crash the API. */
export function loadProducts(file: string): { products: Product[]; rejected: { index: number; reason: string }[] } {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const products: Product[] = [], rejected: { index: number; reason: string }[] = [], seen = new Set<string>();
  (Array.isArray(raw) ? raw : []).forEach((r, i) => {
    const p = productSchema.safeParse(r);
    if (!p.success) return rejected.push({ index: i, reason: p.error.issues[0]?.message ?? "invalid" });
    if (seen.has(p.data.id)) return rejected.push({ index: i, reason: "duplicate id" });
    if (p.data.price !== null && !p.data.currency) return rejected.push({ index: i, reason: "price without currency" });
    seen.add(p.data.id);
    products.push(p.data);
  });
  return { products, rejected };
}

export function productsRouter(cfg: Config) {
  const r = Router();
  const file = path.join(cfg.dataDir, "products.json");
  let cache: { products: Product[]; mtime: number } | null = null;
  const get = () => {
    const mtime = fs.statSync(file).mtimeMs; // reloads automatically when the JSON file is edited
    if (!cache || cache.mtime !== mtime) {
      const { products, rejected } = loadProducts(file);
      if (rejected.length) console.warn(`[products] skipped ${rejected.length} invalid record(s):`, rejected);
      cache = { products, mtime };
    }
    return cache.products;
  };
  r.get("/", (req, res) => {
    const q = String(req.query.q ?? "").trim().toLowerCase().slice(0, 80);
    const category = String(req.query.category ?? "").trim();
    const all = get();
    const items = all.filter((p) => (!category || p.category === category) && (!q || [p.name, p.description, p.manufacturer ?? "", p.seller ?? "", p.category].join(" ").toLowerCase().includes(q)));
    const categories = [...new Set(all.map((p) => p.category))].sort().map((c) => ({ name: c, count: all.filter((p) => p.category === c).length }));
    res.json({ items, total: all.length, categories });
  });
  r.get("/:id", (req, res) => {
    const p = get().find((x) => x.id === req.params.id);
    p ? res.json({ product: p }) : res.status(404).json({ error: "Product not found." });
  });
  return r;
}
