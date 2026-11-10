import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type PlanDay, type WaterInput, type WaterPlan } from "../api";
import { useAuth } from "../auth";
import LocationPicker, { loadLocation, placeLabel } from "../components/LocationPicker";
import { Attribution, ErrorBox, Loading, Note, PageHeader, Tag, errMsg, fmtDate, todayISO, useAsync } from "../components/ui";
import type { Place } from "../api";

const METHODS: Record<string, string> = { flood: "Flood / furrow (≈60% efficient)", sprinkler: "Sprinkler (≈75% efficient)", drip: "Drip (≈90% efficient)" };

export default function Water() {
  const { user } = useAuth();
  const opts = useAsync(() => api.waterOptions(), []);
  const [place, setPlace] = useState<Place | null>(() => loadLocation());
  const [f, setF] = useState({ crop: "", soil: "loam", method: "sprinkler", plantingDate: "", moisture: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<WaterPlan | null>(null);
  const [saved, setSaved] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.crop) return setError("Choose a crop.");
    if (!place) return setError("Choose your location first.");
    if (f.plantingDate && f.plantingDate > todayISO()) return setError("The planting date cannot be in the future.");
    const m = f.moisture.trim() === "" ? undefined : Number(f.moisture);
    if (m !== undefined && (!Number.isFinite(m) || m < 0 || m > 100)) return setError("Soil moisture must be between 0 and 100.");
    const body: WaterInput = { crop: f.crop, soil: f.soil, method: f.method, lat: place.latitude, lon: place.longitude, plantingDate: f.plantingDate || undefined, moisturePct: m, today: todayISO() };
    setBusy(true); setError(""); setRes(null); setSaved("");
    try {
      const r = await api.waterPlan(body); setRes(r);
      setPicked(Object.fromEntries(r.plan.days.filter((d) => d.irrigate).map((d) => [d.date, true])));
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }

  async function saveToCalendar() {
    if (!res) return;
    const days = res.plan.days.filter((d) => d.irrigate && picked[d.date]);
    if (!days.length) return setSaved("Select at least one irrigation day.");
    setBusy(true); setSaved("");
    try {
      for (const d of days) {
        await api.createTask({ title: `Irrigate ${res.plan.crop}`, description: `About ${d.irrigateMm} mm net (≈${Math.round(d.irrigateMm / res.plan.efficiency)} mm applied with your method) — from the CropNexus water plan for ${place ? placeLabel(place) : "your farm"}. Estimate only: check soil moisture before irrigating.`, dueDate: d.date, priority: 2, category: "irrigation" });
      }
      setSaved(`Saved ${days.length} irrigation task${days.length > 1 ? "s" : ""} to your Crop Calendar.`);
    } catch (err) { setSaved(errMsg(err)); } finally { setBusy(false); }
  }

  const p = res?.plan;
  return (
    <>
      <PageHeader icon="💧" title="Water Management" lead="A 7-day irrigation plan using the FAO-56 method: crop water need = reference evapotranspiration (ET₀) from the weather forecast × crop coefficient (Kc), minus useful rain." />
      <LocationPicker onPick={setPlace} current={place} />
      {opts.loading && !opts.data ? <Loading /> : opts.error && !opts.data ? <ErrorBox message={opts.error} onRetry={opts.reload} /> : (
        <form className="card grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="w-crop">Crop</label><select id="w-crop" value={f.crop} onChange={(e) => setF({ ...f, crop: e.target.value })} required><option value="">Select a crop…</option>{opts.data?.crops.map((c) => <option key={c.id} value={c.id}>{c.name} (≈{c.cycleDays} days)</option>)}</select></div>
          <div className="field"><label htmlFor="w-soil">Soil type</label><select id="w-soil" value={f.soil} onChange={(e) => setF({ ...f, soil: e.target.value })}>{opts.data?.soils.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="field"><label htmlFor="w-m">Irrigation method</label><select id="w-m" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{Object.entries(METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="w-d">Planting / sowing date (optional)</label><input id="w-d" type="date" max={todayISO()} value={f.plantingDate} onChange={(e) => setF({ ...f, plantingDate: e.target.value })} /><small className="muted">Used to find the crop's growth stage. If empty, mid-season is assumed.</small></div>
          <div className="field"><label htmlFor="w-s">Soil moisture today, % (optional)</label><input id="w-s" type="number" min="0" max="100" inputMode="decimal" value={f.moisture} onChange={(e) => setF({ ...f, moisture: e.target.value })} placeholder="e.g. 60" /><small className="muted">Share of the available water still in the root zone: 100 = just irrigated, 0 = wilting.</small></div>
          <div className="flex items-end pb-4"><button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? "Calculating…" : "Make water plan"}</button></div>
          {error && <div className="notice error sm:col-span-2 lg:col-span-3" role="alert">{error}</div>}
        </form>
      )}

      {busy && !res && <Loading label="Fetching forecast and calculating…" />}
      {res && p && (
        <section className="mt-8" aria-live="polite" aria-label="Water plan">
          <h2 className="!mt-0">Plan for {p.crop} <Tag>estimate</Tag></h2>
          {res.stale && <Note kind="warn">The weather service could not be reached; this plan uses forecast data from {new Date(res.fetchedAt).toLocaleString()}.</Note>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Growth stage", `${p.stage} (day ${p.dayOfCycle})`],
              ["Next irrigation", p.nextIrrigation ? `${fmtDate(p.nextIrrigation.date)} · ≈${p.nextIrrigation.grossMm} mm` : "Not needed in 7 days"],
              ["Water over 7 days", p.weekNetMm ? `≈${p.weekGrossMm} mm applied (${p.weekNetMm} mm net)` : "None expected"],
              ["Root-zone store", `${p.takMm} mm total · irrigate at ${p.rawMm} mm used`],
            ].map(([k, v]) => <div key={k} className="card !p-4"><p className="muted m-0 text-xs uppercase tracking-wide">{k}</p><p className="m-0 mt-1 font-semibold capitalize">{v}</p></div>)}
          </div>
          <p className="muted mt-2 text-sm">1 mm of water over 1 hectare = 10,000 litres (10 m³). 1 mm over 1 acre ≈ 4,047 litres.</p>

          <div className="card mt-4 overflow-x-auto !p-0">
            <table className="data min-w-[40rem]"><caption className="sr-only">Daily water balance</caption>
              <thead><tr>{user && <th scope="col"><span className="sr-only">Save</span></th>}<th scope="col">Day</th><th scope="col" className="text-right">ET₀ (mm)</th><th scope="col" className="text-right">Kc</th><th scope="col" className="text-right">Crop need (mm)</th><th scope="col" className="text-right">Rain (mm)</th><th scope="col" className="text-right">Water used (mm)</th><th scope="col">Action</th></tr></thead>
              <tbody>{p.days.map((d: PlanDay) => (
                <tr key={d.date} className={d.irrigate ? "bg-brand-50/70 dark:bg-brand-500/10" : ""}>
                  {user && <td>{d.irrigate && <input type="checkbox" className="size-4 cursor-pointer accent-brand-600" checked={!!picked[d.date]} onChange={(e) => setPicked({ ...picked, [d.date]: e.target.checked })} aria-label={`Save irrigation on ${fmtDate(d.date)} to calendar`} />}</td>}
                  <th scope="row" className="text-left font-semibold">{fmtDate(d.date)}</th><td className="text-right tabular-nums">{d.et0}</td><td className="text-right tabular-nums">{d.kc}</td><td className="text-right tabular-nums">{d.etc}</td><td className="text-right tabular-nums">{d.rain}</td><td className="text-right tabular-nums">{d.depletionMm}</td>
                  <td>{d.irrigate ? <b className="text-brand-700 dark:text-brand-300">💧 Irrigate ≈{Math.round(d.irrigateMm / p.efficiency)} mm</b> : <span className="muted">No irrigation</span>}</td>
                </tr>))}</tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {user ? <button type="button" className="btn btn-primary" onClick={saveToCalendar} disabled={busy || !p.days.some((d) => d.irrigate)}>🗓️ Save selected days to Crop Calendar</button>
              : <p className="muted m-0 text-sm"><Link to="/login">Log in</Link> to save these irrigation days to your Crop Calendar.</p>}
            {!p.days.some((d) => d.irrigate) && <span className="muted text-sm">No irrigation is needed in the next 7 days.</span>}
            {saved && <span role="status" className="text-sm font-medium">{saved} {saved.startsWith("Saved") && <Link to="/calendar">Open calendar</Link>}</span>}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="card"><h3 className="!mt-0">Assumptions</h3><ul className="m-0 grid gap-1 pl-5 text-sm">{p.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div>
            <div className="card"><h3 className="!mt-0">Tips</h3><ul className="m-0 grid gap-1 pl-5 text-sm">{p.tips.map((a) => <li key={a}>{a}</li>)}</ul></div>
          </div>
          <Note kind="warn">{res.disclaimer}</Note>
          <Attribution>{res.attribution}. Method: {res.references.map((r, i) => <span key={r.url}>{i > 0 && " · "}<a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></span>)}</Attribution>
        </section>
      )}
    </>
  );
}
