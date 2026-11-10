import { PageHeader } from "../components/ui";
import { useEffect, useState } from "react";
import { api, type HistoryRow, type ModelInfo } from "../api";
import { useI18n } from "../i18n";

const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export function History() {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  useEffect(() => { api.history().then(setRows).catch(() => setRows([])); }, []);
  const del = async (id: string) => { await api.deleteHistory(id); setRows((r) => r?.filter((x) => x.id !== id) ?? null); };
  return (
    <>
      <PageHeader eyebrow={t("history_eyebrow")} title={t("history_title")} lead={t("history_subtitle")} />
      {rows === null ? <p className="muted">{t("common_loading")}</p> : rows.length === 0 ? <div className="card center">{t("history_empty")}</div> : (
        <div className="card overflow-x-auto !p-0">
          <table className="data">
            <thead><tr><th>{t("history_when")}</th><th>{t("history_type")}</th><th>{t("history_result")}</th><th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.timestamp).toLocaleString(lang)}</td>
                <td>{r.type === "crop" ? `🌾 ${t("history_crop")}` : r.type === "soil" ? `🪱 ${t("history_soil")}` : `🍃 ${t("history_leaf")}`}</td>
                <td>{r.type === "crop" ? <><b>{cap(r.recommended_crop)}</b> {r.location && <span className="muted">· {r.location}</span>}</> : r.type === "soil" ? <b>{r.soil_type ? r.soil_type.replace(/_/g, " ") : "Soil-test values"}</b> : <b>{r.disease_name ?? r.top_predictions?.[0]?.class}</b>}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => del(r.id)}>{t("history_delete")}</button></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function ModelDetails() {
  const { t } = useI18n();
  const [info, setInfo] = useState<ModelInfo | null>(null);
  useEffect(() => { api.modelInfo().then(setInfo).catch(() => {}); }, []);
  const pct = (v?: number) => (v ? `${(v * 100).toFixed(2)}%` : "–");
  const Model = ({ title, m }: { title: string; m?: { model_name?: string; final_model_name?: string; test_accuracy?: number; n_classes?: number; classes?: string[] } | null }) => (
    <div className="card">
      <h3>{title}</h3>
      {m ? <>
        <table className="kv"><tbody>
          <tr><td>{t("about_algorithm")}</td><td>{m.final_model_name ?? m.model_name}</td></tr>
          <tr><td>{t("about_accuracy")}</td><td>{pct(m.test_accuracy)}</td></tr>
          <tr><td>{t("about_classes")}</td><td>{m.n_classes}</td></tr>
        </tbody></table>
        <div className="chips">{m.classes?.map((c) => <span className="chip" key={c}>{c.replace(/___/g, " — ").replace(/_/g, " ")}</span>)}</div>
      </> : <p className="muted">–</p>}
    </div>
  );
  return (
    <>
      <PageHeader eyebrow={t("about_eyebrow")} title={t("about_title")} lead={t("about_architecture")} />
      <div className="grid gap-5 md:grid-cols-2">
        <Model title={t("about_crop_model")} m={info?.crop_model} />
        <Model title={t("about_leaf_model")} m={info?.leaf_model} />
      </div>
      {info?.crop_model?.accuracy_by_source && info.crop_model.data_sources && (
        <div className="card mt-5">
          <h3>{t("about_data")}</h3>
          <table className="kv"><tbody>
            {(["real", "synthetic"] as const).map((k) => (
              <tr key={k}>
                <td>{k === "real" ? t("about_real") : t("about_synth")}</td>
                <td>{info.crop_model.data_sources![k].crops.length} · {info.crop_model.data_sources![k].rows} rows · {pct(info.crop_model.accuracy_by_source![k].accuracy)}</td>
              </tr>
            ))}
          </tbody></table>
          <div className="chips mt-2">{info.crop_model.data_sources.synthetic.crops.map((c) => <span className="chip" key={c}>⚠ {c}</span>)}</div>
          <p className="muted mt-3 text-sm">{t("about_synth_note")}</p>
        </div>
      )}
    </>
  );
}
