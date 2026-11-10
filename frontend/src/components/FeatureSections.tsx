import { Link } from "react-router-dom";
import { ArrowRight, Check, Lock } from "lucide-react";
import { useAuth } from "../auth";
import { FEATURES } from "../features";
import { useI18n } from "../i18n";
import { Glyph } from "./icons";
import { Reveal } from "./motion";

/**
 * One clean split-layout section per feature: the picture fills one half of the container, the detailed description the other.
 * Layouts alternate left/right on wide screens and stack (picture first) on phones. Everything is static —
 * no flipping, rotating or hover-triggered movement.
 */
export default function FeatureSections() {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <div className="mt-10 flex flex-col gap-8 sm:gap-12">
      {FEATURES.map((f, i) => {
        const reverse = i % 2 === 1;
        const title = t(f.title);
        const locked = f.auth && !user;
        return (
          <Reveal as="article" key={f.id} labelledBy={`fs-${f.id}`} className="gradient-border grid overflow-hidden rounded-3xl bg-white/95 shadow-xl shadow-brand-900/5 dark:bg-slate-900/75 md:grid-cols-2">
            <div className={`relative aspect-[16/10] min-h-56 bg-brand-50 md:aspect-auto md:min-h-[22rem] dark:bg-slate-800 ${reverse ? "md:order-2" : ""}`}>
              <div className="absolute inset-0 [&_svg]:size-full">{f.art()}</div>
            </div>
            <div className={`flex flex-col justify-center gap-4 p-6 sm:p-10 ${reverse ? "md:order-1" : ""}`}>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-50 py-1 pl-1.5 pr-3 text-xs font-bold uppercase tracking-wider text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                <span className="grid size-6 place-items-center rounded-full bg-brand-600 text-white"><Glyph name={f.icon} className="size-3.5" /></span>
                {locked ? t("nf_login_needed") : t("nf_explore")}
                {locked && <Lock aria-hidden="true" className="size-3 text-amber-600" />}
              </span>
              <h3 id={`fs-${f.id}`} className="!m-0 !text-2xl sm:!text-3xl">{title}</h3>
              <p className="m-0 leading-relaxed text-slate-600 dark:text-slate-300">{t(f.long)}</p>
              <ul className="m-0 grid list-none gap-2.5 p-0 text-sm text-slate-700 dark:text-slate-200">
                {f.points.map((k) => (
                  <li key={k} className="flex items-start gap-2.5">
                    <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white"><Check className="size-3" strokeWidth={3} /></span>
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <Link to={f.path} className="btn btn-primary group">
                  {locked ? t("nf_login_needed") : t("nf_open")} <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
