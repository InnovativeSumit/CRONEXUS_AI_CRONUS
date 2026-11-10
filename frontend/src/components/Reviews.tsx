import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type FeedbackList, type Rating } from "../api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import Avatar from "./Avatar";
import Stars from "./Stars";
import { Reveal, SpotlightCard } from "./motion";

/** Real, published feedback from the database — never placeholder text. Refreshes every 30 s. */
export default function Reviews() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<FeedbackList | null>(null);

  useEffect(() => {
    const load = () => api.feedbackList().then(setData).catch(() => {});
    load();
    const id = window.setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section aria-labelledby="reviews-h">
      <div className="text-center">
        <h2 id="reviews-h">{t("rev_title")}</h2>
        <p className="muted">{t("rev_subtitle")}</p>
      </div>

      {data && data.count > 0 && data.average !== null && (
        <div className="card mx-auto mt-6 grid max-w-2xl items-center gap-5 sm:grid-cols-[auto_1fr]">
          <div className="text-center">
            <div className="font-display text-5xl font-extrabold text-brand-700 dark:text-brand-300">{data.average.toFixed(1)}</div>
            <Stars n={Math.round(data.average)} />
            <div className="mt-1 text-xs text-slate-500">{data.count} {t("rev_count")}</div>
          </div>
          <ul className="m-0 grid list-none gap-1.5 p-0" aria-label={t("rev_dist")}>
            {([5, 4, 3, 2, 1] as Rating[]).map((n) => {
              const c = data.distribution?.[n] ?? 0;
              return (
                <li key={n} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2 text-xs">
                  <span className="font-bold tabular-nums">{n}★</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${data.count ? (c / data.count) * 100 : 0}%` }} /></span>
                  <span className="text-right tabular-nums text-slate-500">{c}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data && data.items.length === 0 ? (
        <div className="card mx-auto mt-6 max-w-xl text-center">
          <p className="muted">{t("rev_empty")}</p>
        </div>
      ) : (
        <ul className="m-0 mt-6 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((f) => (
            <Reveal as="li" key={f.id}><SpotlightCard className="card flex h-full flex-col">
              <div className="flex items-center justify-between"><Stars n={f.rating} /><span className="text-2xl text-brand-300/70 dark:text-brand-500/50" aria-hidden="true">❝</span></div>
              <blockquote className="my-3 flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">“{f.text}”</blockquote>
              <div className="flex items-center gap-3">
                <Avatar value={f.avatar} name={f.name} size={40} />
                <div className="leading-tight">
                  <b className="text-sm">{f.name}</b>
                  <div className="text-xs text-slate-500">{new Date(f.createdAt).toLocaleDateString(lang)}</div>
                </div>
              </div>
            </SpotlightCard></Reveal>
          ))}
        </ul>
      )}
      <p className="mt-6 text-center"><Link className="btn btn-ghost" to={user ? "/feedback" : "/signup"}>{t("rev_cta")} →</Link></p>
    </section>
  );
}
