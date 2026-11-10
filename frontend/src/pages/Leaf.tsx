import { PageHeader } from "../components/ui";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, type LeafResult } from "../api";
import { useI18n } from "../i18n";

export default function Leaf() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<LeafResult | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f?: File | null) => {
    if (!f) return;
    setRes(null); setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { setFile(null); return setError(t("leaf_err_type")); }
    if (f.size > 12 * 1024 * 1024) { setFile(null); return setError(t("leaf_err_size")); }
    setFile(f);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setError("");
    try { setRes(await api.leaf(file)); } catch (err) { setError(err instanceof ApiError ? err.message : t("common_error")); } finally { setBusy(false); }
  }

  const best = res?.top_predictions[0];
  const healthy = res?.info.is_healthy;
  return (
    <>
      <PageHeader eyebrow={t("leaf_eyebrow")} title={t("leaf_title")} lead={t("leaf_subtitle")} />
      <form className="card mx-auto max-w-xl" onSubmit={submit}>
        <div className={`dropzone ${preview ? "has" : ""}`} role="button" tabIndex={0} aria-label={t("leaf_choose")} onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}>
          {preview ? (
            <div className={`preview ${busy ? "scanning" : ""}`}><img src={preview} alt="" />{busy && <div className="scan-line" />}</div>
          ) : <div className="drop-hint"><span>📷</span><p>{t("leaf_choose")}</p></div>}
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        <p className="muted mt-0 text-center text-sm">{t("leaf_tips")}</p>
        {error && <div className="notice error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={!file || busy}>{busy ? t("leaf_scanning") : t("leaf_detect_button")}</button>
      </form>

      {res && best && (
        <div className="card mx-auto my-6 max-w-xl">
          <span className={`badge ${healthy ? "ok" : "bad"}`}>{healthy ? t("leaf_result_healthy") : t("leaf_result_disease")}</span>
          <h2 className="!mt-3">{res.info.crop} — {res.info.disease_name ?? best.class}</h2>
          <div className="rank-track big"><div className="rank-bar" style={{ width: `${best.confidence}%` }} /></div>
          <p className="muted">{t("leaf_confidence")}: <b>{best.confidence}%</b></p>
          {best.confidence < 50 && <div className="notice warn" role="alert">⚠ {t("leaf_low_conf")}</div>}
          {res.info.symptoms && <><h3>{t("leaf_symptoms")}</h3><p>{res.info.symptoms}</p></>}
          {res.info.treatment && <><h3>{t("leaf_treatment")}</h3><p>{res.info.treatment}</p></>}
          <h3>{t("leaf_other")}</h3>
          {res.top_predictions.slice(1).map((p) => <p key={p.class} className="muted">{p.class.replace(/___/g, " — ").replace(/_/g, " ")} · {p.confidence}%</p>)}
          <button className="btn btn-ghost mt-4" type="button" onClick={() => { setFile(null); setRes(null); }}>{t("leaf_scan_again")}</button>
        </div>
      )}
    </>
  );
}
