import { useState, type FormEvent } from "react";
import { api, type Place } from "../api";
import { errMsg } from "./ui";

const KEY = "cn_location";
export const loadLocation = (): Place | null => { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && typeof v.latitude === "number" && typeof v.longitude === "number" ? v : null; } catch { return null; } };
export const saveLocation = (p: Place) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } };
export const placeLabel = (p: Place) => [p.name, p.admin1, p.country].filter(Boolean).join(", ");

/** Place search (Open-Meteo geocoding) + "use my location". Remembers the last choice in this browser. */
export default function LocationPicker({ onPick, current }: { onPick: (p: Place) => void; current?: Place | null }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return setError("Type at least 2 characters.");
    setBusy(true); setError("");
    try { setResults((await api.weatherSearch(q.trim())).places); } catch (err) { setError(errMsg(err)); setResults(null); } finally { setBusy(false); }
  }
  const pick = (p: Place) => { saveLocation(p); setResults(null); setQ(""); onPick(p); };
  function geo() {
    if (!navigator.geolocation) return setError("Your browser does not support location.");
    setBusy(true); setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setBusy(false); pick({ name: "My location", latitude: +pos.coords.latitude.toFixed(4), longitude: +pos.coords.longitude.toFixed(4) }); },
      (err) => { setBusy(false); setError(err.code === 1 ? "Location permission was denied. Search for your village or town instead." : "Could not get your location. Search for your village or town instead."); },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }
  return (
    <div className="card mb-5">
      <form onSubmit={search} className="flex flex-wrap gap-2" role="search" aria-label="Find a place">
        <label htmlFor="loc-q" className="sr-only">Village, town or city</label>
        <input id="loc-q" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 dark:border-white/15 dark:bg-slate-950/70" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your village, town or city" maxLength={80} autoComplete="off" />
        <button className="btn btn-primary" disabled={busy}>{busy ? "Searching…" : "Search"}</button>
        <button type="button" className="btn btn-ghost" onClick={geo} disabled={busy}>📍 Use my location</button>
      </form>
      {error && <p className="err mb-0 mt-2 text-sm" role="alert">{error}</p>}
      {results && (results.length === 0
        ? <p className="muted mb-0 mt-3 text-sm">No place found for “{q}”. Check the spelling or try a nearby larger town.</p>
        : <ul className="m-0 mt-3 grid list-none gap-1 p-0" aria-label="Matching places">{results.map((p, i) => <li key={`${p.latitude}-${p.longitude}-${i}`}><button type="button" className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-left text-sm hover:border-brand-500 dark:border-white/10 dark:bg-white/5" onClick={() => pick(p)}><b>{p.name}</b><span className="muted">{[p.admin1, p.country].filter(Boolean).length ? ` — ${[p.admin1, p.country].filter(Boolean).join(", ")}` : ""}</span></button></li>)}</ul>)}
      {current && <p className="muted mb-0 mt-3 text-sm">Showing: <b>{placeLabel(current)}</b> ({current.latitude.toFixed(2)}, {current.longitude.toFixed(2)})</p>}
    </div>
  );
}
