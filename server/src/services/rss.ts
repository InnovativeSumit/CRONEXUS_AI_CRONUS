import { XMLParser } from "fast-xml-parser";

export interface NewsItem { title: string; link: string; summary: string; published: string | null; source: string }

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: true, trimValues: true });
const arr = <T,>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
const text = (v: any): string => (v == null ? "" : typeof v === "object" ? String(v["#text"] ?? "") : String(v));
const strip = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : "");

export function parseFeed(xml: string, source: string): NewsItem[] {
  const doc = parser.parse(xml);
  const items: NewsItem[] = [];
  for (const it of arr(doc?.rss?.channel?.item)) {
    const link = safeUrl(text(it.link));
    if (!link || !text(it.title)) continue;
    const d = text(it.pubDate);
    items.push({ title: strip(text(it.title)), link, summary: strip(text(it.description)).slice(0, 300), published: d && !Number.isNaN(Date.parse(d)) ? new Date(d).toISOString() : null, source });
  }
  for (const e of arr(doc?.feed?.entry)) {
    const l = arr<any>(e.link).find((x) => x?.["@_rel"] === "alternate" || !x?.["@_rel"]);
    const link = safeUrl(typeof e.link === "string" ? e.link : l?.["@_href"] ?? "");
    if (!link || !text(e.title)) continue;
    const d = text(e.updated || e.published);
    items.push({ title: strip(text(e.title)), link, summary: strip(text(e.summary || e.content)).slice(0, 300), published: d && !Number.isNaN(Date.parse(d)) ? new Date(d).toISOString() : null, source });
  }
  return items;
}
