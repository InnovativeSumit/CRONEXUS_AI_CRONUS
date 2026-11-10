import { useI18n } from "../i18n";
import { Radio, Users } from "lucide-react";
import { useStats } from "../stats";
import { CountUp } from "./motion";

/**
 * Live community numbers (registered users and users signed in right now), read from the backend.
 * Rendered ONLY on the public landing page and the signed-in Home page — nowhere else.
 */
export default function LiveStats() {
  const { t } = useI18n();
  const { stats, live } = useStats();
  const items = [
    { icon: <Users className="size-4" aria-hidden="true" />, label: t("stats_total"), n: stats?.totalUsers },
    { icon: <Radio className="size-4" aria-hidden="true" />, label: t("stats_online"), n: stats?.onlineNow },
  ];
  return (
    <section aria-label={t("stats_hdr_aria")} className="my-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-200/70 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-800 p-5 text-white shadow-lg shadow-brand-900/15 sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:border-white/10">
        <div>
          <span className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${live ? "text-amber-300" : "text-brand-200"}`}>
            <i aria-hidden="true" className={`size-2 rounded-full ${live ? "animate-pulse bg-amber-400" : "bg-brand-300"}`} />
            {live ? t("stats_live") : t("stats_offline")}
          </span>
          <p className="m-0 mt-1 font-display text-lg font-bold">{t("stats_title")}</p>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-3 sm:gap-6" role="status">
          {items.map((it) => (
            <div key={it.label} className="rounded-xl bg-white/10 px-5 py-3 text-center ring-1 ring-white/10 sm:min-w-40">
              <dt className="flex items-center justify-center gap-1.5 text-xs text-brand-100">{it.icon}{it.label}</dt>
              <dd className="m-0 font-display text-3xl font-extrabold tabular-nums"><CountUp value={it.n} /></dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
