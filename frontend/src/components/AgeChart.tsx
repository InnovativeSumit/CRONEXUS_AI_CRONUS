import type { AgeGroup } from "../api";
import { useI18n } from "../i18n";

export const groupOf = (age: number): AgeGroup => (age <= 17 ? "0-17" : age <= 24 ? "18-24" : age <= 30 ? "25-30" : "30+");
const GROUPS: AgeGroup[] = ["0-17", "18-24", "25-30", "30+"];

/**
 * Age-range guide for the sign-up form. It only highlights the range matching the age being typed —
 * it never shows registration counts or any live community numbers.
 */
export default function AgeChart({ age }: { age?: number | null }) {
  const { t } = useI18n();
  const mine = age !== null && age !== undefined && !Number.isNaN(age) ? groupOf(age) : null;
  const label = (g: AgeGroup) => (g === "30+" ? t("age_above30") : g.replace("-", "–"));
  return (
    <figure className="card m-0 flex h-full flex-col" aria-label={t("reg_range_title")}>
      <figcaption>
        <h3 className="!mt-0">{t("reg_range_title")}</h3>
        <p className="muted text-sm">{t("reg_range_sub")}</p>
      </figcaption>
      <ol className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
        {GROUPS.map((g, i) => {
          const on = mine === g;
          return (
            <li key={g} aria-current={on ? "true" : undefined} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${on ? "border-amber-400 bg-amber-50 shadow-sm dark:bg-amber-500/10" : "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/5"}`}>
              <span aria-hidden="true" className={`h-2.5 rounded-full ${on ? "bg-amber-500" : "bg-brand-400"}`} style={{ width: `${(i + 1) * 22}%`, minWidth: 28 }} />
              <b className={`ml-auto whitespace-nowrap font-display text-sm ${on ? "text-amber-800 dark:text-amber-200" : "text-slate-700 dark:text-slate-200"}`}>{label(g)}</b>
              {on && <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">▲ {t("reg_you")}</span>}
            </li>
          );
        })}
      </ol>
      {mine && <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-center text-sm font-medium text-brand-800 dark:bg-brand-500/15 dark:text-brand-200">{t("reg_your_group")}: <b>{label(mine)}</b></p>}
    </figure>
  );
}
