import { PageHeader } from "../components/ui";
import { useState, type FormEvent } from "react";
import { api, ApiError, type AdvisoryResult } from "../api";
import { useI18n, type Messages } from "../i18n";

const SOILS: [string, keyof Messages][] = [["Loamy Soil", "soil_loamy"], ["Clay Soil", "soil_clay"], ["Sandy Soil", "soil_sandy"], ["Silty Soil", "soil_silty"], ["Black Soil", "soil_black"], ["Red Soil", "soil_red"], ["Alluvial Soil", "soil_alluvial"]];
const FIELDS: { k: string; l: keyof Messages; step: string; ph: string }[] = [
  { k: "nitrogen", l: "advisory_n", step: "0.1", ph: "90" }, { k: "phosphorus", l: "advisory_p", step: "0.1", ph: "42" }, { k: "potassium", l: "advisory_k", step: "0.1", ph: "43" },
  { k: "temperature", l: "advisory_temp", step: "0.1", ph: "25.5" }, { k: "humidity", l: "advisory_hum", step: "0.1", ph: "80" }, { k: "ph", l: "advisory_ph", step: "0.01", ph: "6.5" }, { k: "rainfall", l: "advisory_rain", step: "0.1", ph: "200" },
];
const EXAMPLE = { location: "Nadia, West Bengal", soil_type: "Loamy Soil", nitrogen: "90", phosphorus: "42", potassium: "43", temperature: "25.5", humidity: "80", ph: "6.5", rainfall: "200" };
const blank = Object.fromEntries(Object.keys(EXAMPLE).map((k) => [k, ""]));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Advisory() {
  const { t } = useI18n();
  const [f, setF] = useState<Record<string, string>>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<AdvisoryResult | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const r = await api.advisory(f);
      setRes({ ...r, location: f.location, soil_type: f.soil_type });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common_error"));
    } finally { setBusy(false); }
  }

  if (res) return <Result r={res} onAgain={() => setRes(null)} />;

  return (
    <>
      <PageHeader eyebrow={t("advisory_eyebrow")} title={t("advisory_title")} lead={t("advisory_subtitle")} />
      <form className="card mx-auto max-w-4xl" onSubmit={submit}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="field"><label>{t("advisory_location")}</label><input value={f.location} onChange={set("location")} placeholder={t("advisory_location_ph")} required /></div>
          <div className="field"><label>{t("advisory_soil_type")}</label>
            <select value={f.soil_type} onChange={set("soil_type")} required>
              <option value="">{t("advisory_soil_select")}</option>
              {SOILS.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
            </select></div>
        </div>
        <h3>{t("advisory_nutrients")}</h3>
        <div className="grid gap-4 sm:grid-cols-3">{FIELDS.slice(0, 3).map(fl => <Num key={fl.k} fl={fl} f={f} set={set} t={t} />)}</div>
        <h3>{t("advisory_climate")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{FIELDS.slice(3).map(fl => <Num key={fl.k} fl={fl} f={f} set={set} t={t} />)}</div>
        {error && <div className="notice error" role="alert">{error}</div>}
        <div className="row">
          <button className="btn btn-primary" disabled={busy}>{busy ? t("advisory_analyzing") : t("advisory_submit")}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setF(EXAMPLE)}>{t("advisory_fill_example")}</button>
        </div>
      </form>
    </>
  );
}

function Num({ fl, f, set, t }: { fl: (typeof FIELDS)[number]; f: Record<string, string>; set: (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => void; t: (k: keyof Messages) => string }) {
  return <div className="field"><label>{t(fl.l)}</label><input type="number" step={fl.step} value={f[fl.k]} onChange={set(fl.k)} placeholder={`e.g. ${fl.ph}`} required /></div>;
}

function Result({ r, onAgain }: { r: AdvisoryResult; onAgain: () => void }) {
  const { t } = useI18n();
  const i = r.inputs, info = r.info;
  return (
    <>
      <div className="py-8">
        <span className="eyebrow">{t("result_eyebrow")} {r.location || t("result_your_field")}</span>
        <h1>{t("result_recommended")} <span className="highlight">{cap(r.recommended_crop)}</span></h1>
        {r.data_source === "synthetic" && <div className="notice warn mt-3 max-w-3xl" role="note">⚠ {t("res_synth_note")}</div>}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="card">
          <h3>🏆 {t("result_top3")}</h3>
          {r.top_crops.map((c, n) => (
            <div className={`rank ${n === 0 ? "best" : ""}`} key={c.crop}>
              <span className="rank-badge">{n + 1}</span><span className="rank-name">{cap(c.crop)}</span>
              <div className="rank-track"><div className="rank-bar" style={{ width: `${c.confidence}%` }} /></div><span>{c.confidence}%</span>
            </div>
          ))}
          <h3>🧪 {t("result_fertilizer")}</h3>
          <p>{info.fertilizer_guidance}</p>
          <ul>{r.tips.map((x) => <li key={x}>{x}</li>)}</ul>
          <h3>💧 {t("result_irrigation")}</h3>
          <p>{info.irrigation_guidance}</p>
          <h3>🦠 {t("result_diseases")}</h3>
          <div className="chips">{info.common_diseases?.map((d) => <span className="chip" key={d}>{d}</span>)}</div>
        </div>
        <div className="card">
          <h3>📋 {t("result_inputs")}</h3>
          <table className="kv"><tbody>
            <tr><td>{t("result_location")}</td><td>{r.location}</td></tr><tr><td>{t("result_soil")}</td><td>{r.soil_type}</td></tr>
            <tr><td>N</td><td>{i.N}</td></tr><tr><td>P</td><td>{i.P}</td></tr><tr><td>K</td><td>{i.K}</td></tr>
            <tr><td>{t("result_temp")}</td><td>{i.temperature} °C</td></tr><tr><td>{t("result_hum")}</td><td>{i.humidity} %</td></tr>
            <tr><td>pH</td><td>{i.ph}</td></tr><tr><td>{t("result_rain")}</td><td>{i.rainfall} mm</td></tr>
          </tbody></table>
        </div>
        <div className="card">
          <h3>🌾 {t("result_ideal")} {cap(r.recommended_crop)}</h3>
          <table className="kv"><tbody>{Object.entries(info.ideal_conditions ?? {}).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>
          <p className="season">📅 {t("result_season")}: <b>{info.season}</b></p>
          <button className="btn btn-ghost btn-block" onClick={onAgain}>{t("result_again")}</button>
        </div>
      </div>
    </>
  );
}
