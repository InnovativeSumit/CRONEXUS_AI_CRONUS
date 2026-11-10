import { PageHeader } from "../components/ui";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type MyFeedback, type Rating } from "../api";
import { useAuth } from "../auth";
import Stars from "../components/Stars";
import StarRating from "../components/StarRating";
import { useI18n, type Messages } from "../i18n";

const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const MAX_WORDS = 30;

export default function Feedback() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [text, setText] = useState("");
  const [rating, setRating] = useState<Rating | 0>(0);
  const [mine, setMine] = useState<{ items: MyFeedback[]; remaining: number; max: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState<string | false>(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const words = wordCount(text), over = words > MAX_WORDS;
  const load = () => api.myFeedback().then(setMine).catch(() => {});
  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setOk(false); setBusy(true);
    try {
      if (!rating) return setError(t("fb_rating_required"));
      await api.sendFeedback({ name: name.trim(), text: text.trim(), rating });
      setText(""); setRating(0); setOk(t("fb_thanks")); await load();
    } catch (err) { setError(err instanceof ApiError ? err.message : t("common_error")); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    setError(""); setOk(false);
    try { await api.deleteFeedback(id); setConfirmId(null); setOk(t("fb_deleted")); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : t("common_error")); }
  }
  const status = (s: MyFeedback["status"]) => t(`fb_${s}` as keyof Messages);
  const full = mine !== null && mine.remaining === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={`★ ${t("nav_feedback")}`} title={t("fb_title")} lead={t("fb_subtitle")} />
      <div className="card">
        {full ? <><div className="notice ok">{t("fb_limit")}</div>{ok && <div className="notice ok" role="status">{ok}</div>}{error && <div className="notice error" role="alert">{error}</div>}</> : (
          <form onSubmit={submit} noValidate>
            <div className="field"><label htmlFor="fb-name">{t("fb_name")}</label><input id="fb-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} required /></div>
            <div className={`field ${over ? "has-error" : ""}`}>
              <label htmlFor="fb-text">{t("fb_text")}</label>
              <textarea id="fb-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 dark:border-white/15 dark:bg-slate-950/70 dark:text-slate-100" />
              <small className={`self-end tabular-nums ${over ? "err font-bold" : "text-slate-500"}`}>{words} / {MAX_WORDS} {t("fb_words")}</small>
            </div>
            <fieldset className="mb-4 border-0 p-0">
              <legend className="mb-1.5 text-sm font-semibold">{t("fb_rating")}</legend>
              <StarRating value={rating} onChange={setRating} />
            </fieldset>
            {error && <div className="notice error" role="alert">{error}</div>}
            {ok && <div className="notice ok" role="status">{ok}</div>}
            <div className="flex items-center justify-between gap-3">
              <button className="btn btn-primary" disabled={busy || over || !text.trim() || name.trim().length < 2 || !rating}>{busy ? t("auth_working") : t("fb_submit")}</button>
              {mine && <span className="text-sm text-slate-500">{t("fb_left")}: <b>{mine.remaining}</b> / {mine.max}</span>}
            </div>
          </form>
        )}
      </div>

      <h2 className="!text-xl">{t("fb_yours")}</h2>
      {mine && mine.items.length === 0 ? <p className="muted">{t("fb_none")}</p> : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {mine?.items.map((f) => (
            <li key={f.id} className="card !p-4">
              <div className="flex items-center justify-between gap-2"><Stars n={f.rating} size="text-base" />
                <span className={`badge ${f.status === "published" ? "ok" : f.status === "rejected" ? "bad" : "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"}`}>{status(f.status)}</span></div>
              <p className="my-2 text-sm">“{f.text}”</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <small className="text-slate-500">{f.name} · {new Date(f.createdAt).toLocaleDateString(lang)}</small>
                {confirmId === f.id ? (
                  <span className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label={t("fb_delete_confirm")}>
                    <small className="err">{t("fb_delete_confirm")}</small>
                    <button className="btn btn-sm !bg-red-600 !text-white hover:!bg-red-700" onClick={() => void remove(f.id)}>{t("fb_confirm_yes")}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>{t("fb_cancel")}</button>
                  </span>
                ) : (
                  <button className="btn btn-ghost btn-sm !border-red-300 !text-red-700 hover:!bg-red-50 dark:!border-red-500/40 dark:!text-red-300 dark:hover:!bg-red-500/10" onClick={() => setConfirmId(f.id)}>🗑 {t("fb_delete")}</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
