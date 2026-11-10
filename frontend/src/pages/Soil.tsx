import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, type SoilAnalysis } from "../api";
import { Empty, ErrorBox, Loading, Note, PageHeader, Tag, errMsg, useAsync } from "../components/ui";

const FIELDS: { k: string; label: string; unit: string; hint: string; step: string }[] = [
  { k: "nitrogen", label: "Available nitrogen (N)", unit: "kg/ha", hint: "0 – 2000", step: "any" },
  { k: "phosphorus", label: "Available phosphorus (P, Olsen)", unit: "kg/ha", hint: "0 – 500", step: "any" },
  { k: "potassium", label: "Available potassium (K)", unit: "kg/ha", hint: "0 – 2000", step: "any" },
  { k: "organic_carbon", label: "Organic carbon", unit: "%", hint: "0 – 20", step: "any" },
  { k: "ph", label: "Soil pH", unit: "", hint: "0 – 14", step: "0.1" },
  { k: "ec", label: "Electrical conductivity (EC)", unit: "dS/m", hint: "0 – 50", step: "any" },
];
const LIMITS: Record<string, [number, number]> = { nitrogen: [0, 2000], phosphorus: [0, 500], potassium: [0, 2000], organic_carbon: [0, 20], ph: [0, 14], ec: [0, 50] };
const good = (r: string) => ["medium", "neutral", "normal", "moderately acidic"].includes(r);

export default function Soil() {
  const status = useAsync(() => api.soilStatus(), []);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [v, setV] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<SoilAnalysis | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!file) { setPreview(""); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);
  const pick = (f?: File | null) => {
    if (!f) return; setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { setFile(null); return setError("Please choose a JPG, PNG or WEBP photo."); }
    if (f.size > 12 * 1024 * 1024) { setFile(null); return setError("That photo is larger than 12 MB."); }
    setFile(f);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (const [k, [lo, hi]] of Object.entries(LIMITS)) {
      const raw = (v[k] ?? "").trim(); if (!raw) continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) errs[k] = "Enter a number."; else if (n < lo || n > hi) errs[k] = `Enter a value between ${lo} and ${hi}.`;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!file && !Object.values(v).some((x) => x.trim())) return setError("Add a soil photo, enter at least one soil-test value, or both.");
    setBusy(true); setError(""); setRes(null);
    try { setRes(await api.soilAnalyze(file, v)); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }
  const st = status.data, m = st?.metrics;
  const acc = m?.test_accuracy !== undefined ? `${(m.test_accuracy * 100).toFixed(1)}%` : null;

  return (
    <>
      <PageHeader icon="🪱" title="Soil Health" lead="Two separate tools: a photo model that guesses the broad soil type, and a checker that rates the values from your soil test (lab report, Soil Health Card or test kit)." />
      {status.loading && !st ? <Loading /> : status.error && !st ? <ErrorBox message={status.error} onRetry={status.reload} /> : (
        <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-2">
          <section className="card" aria-labelledby="sp-h">
            <h2 id="sp-h" className="!mt-0 !text-xl">1 · Soil photo <Tag tone="amber">experimental</Tag></h2>
            {st?.image_model_available ? (
              <>
                <Note kind="warn"><b>Treat this as a rough hint only.</b> {acc ? <>On {m?.test_images ?? "a small set of"} held-out test photos the model was right {acc} of the time across {m?.n_classes ?? "several"} soil types (random guessing would be about {m?.n_classes ? Math.round(100 / m.n_classes) : "14"}%). </> : null}{m?.limitations ?? "Soil type cannot be judged reliably from a photograph; colour depends on moisture and light."} It cannot measure nutrients, pH or salinity.</Note>
                <div className="dropzone" role="button" tabIndex={0} aria-label="Choose a soil photo" onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}>
                  {preview ? <div className="preview"><img src={preview} alt="Selected soil" /></div> : <div className="drop-hint"><span>📷</span><p>Click or drop a photo of bare soil (daylight, close-up, no plants)</p></div>}
                  <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
                </div>
                {file && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }}>Remove photo</button>}
              </>
            ) : <Note kind="warn"><b>The soil-photo model is not available on this server.</b> {st?.error ?? "It has not been trained here yet."} You can still use the soil-test form on the right. {st?.how_to_train && <>To enable it, see the README (<code>{st.how_to_train}</code>).</>}</Note>}
          </section>

          <section className="card" aria-labelledby="sv-h">
            <h2 id="sv-h" className="!mt-0 !text-xl">2 · Soil-test values <Tag tone="slate">rule-based</Tag></h2>
            <p className="muted mt-0 text-sm">Optional — fill in what your test report shows; leave the rest empty. Ratings follow general Soil-Health-Card style ranges and are not a laboratory result.</p>
            <div className="grid gap-x-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.k} className={`field ${errors[f.k] ? "has-error" : ""}`}>
                  <label htmlFor={`sv-${f.k}`}>{f.label}{f.unit && <span className="muted font-normal"> ({f.unit})</span>}</label>
                  <input id={`sv-${f.k}`} type="number" inputMode="decimal" step={f.step} placeholder={f.hint} value={v[f.k] ?? ""} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} aria-describedby={errors[f.k] ? `sv-${f.k}-e` : undefined} />
                  {errors[f.k] && <small id={`sv-${f.k}-e`} className="err">{errors[f.k]}</small>}
                </div>))}
            </div>
          </section>

          <div className="lg:col-span-2">
            {error && <div className="notice error" role="alert">{error}</div>}
            <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Analysing…" : "Analyse soil"}</button>
          </div>
        </form>
      )}

      {res && (
        <section className="mt-8" aria-live="polite" aria-label="Soil results">
          <h2 className="!mt-0">Results</h2>
          {res.imageError && <Note kind="warn">The photo could not be analysed: {res.imageError}</Note>}
          {!res.image && !res.measurements && !res.imageError && <Empty title="Nothing to show" />}
          <div className="grid gap-5 lg:grid-cols-2">
            {res.image && (
              <div className="card">
                <h3 className="!mt-0">Photo: likely soil type <Tag>rough guess</Tag></h3>
                {res.image.low_confidence && <Note kind="warn">The model is not confident about this photo (top guess under 50%). Do not rely on it.</Note>}
                <p className="m-0 font-display text-2xl font-bold">{res.image.info.label}</p>
                <ul className="m-0 my-3 grid list-none gap-1 p-0">{res.image.top_predictions.map((p) => <li key={p.class} className="rank !grid-cols-[1fr_1fr_3.5rem]"><span>{p.label}</span><span className="rank-track"><span className="rank-bar block" style={{ width: `${p.confidence}%` }} /></span><b className="text-right">{p.confidence.toFixed(0)}%</b></li>)}</ul>
                <p className="text-sm"><b>About:</b> {res.image.info.about}</p>
                {res.image.info.suits && <p className="text-sm"><b>Often suits:</b> {res.image.info.suits}</p>}
                {res.image.info.improve && <p className="text-sm"><b>Care tips:</b> {res.image.info.improve}</p>}
                <p className="muted text-xs">General textbook information for this soil type — your own field may differ. Confirm with a soil test.</p>
              </div>
            )}
            {res.measurements && (
              <div className="card">
                <h3 className="!mt-0">Soil-test ratings</h3>
                <ul className="m-0 grid list-none gap-3 p-0">
                  {res.measurements.ratings.map((r) => (
                    <li key={r.parameter} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                      <p className="m-0 flex flex-wrap items-center justify-between gap-2"><b>{r.label}</b><span>{r.value}{r.unit ? ` ${r.unit}` : ""} <Tag tone={good(r.rating) ? "green" : "amber"}>{r.rating}</Tag></span></p>
                      <p className="muted m-0 mt-1 text-sm">{r.advice}</p>
                    </li>))}
                </ul>
                <p className="muted mt-3 text-xs">{res.measurements.method} Recommended fertiliser doses depend on crop, season and region — follow your local agriculture department or KVK advice.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
