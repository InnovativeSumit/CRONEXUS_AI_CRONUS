import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import FeatureSections from "../components/FeatureSections";
import LiveStats from "../components/LiveStats";
import Reviews from "../components/Reviews";
import FarmScene from "../components/FarmScene";
import { m as mo } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { FEATURES } from "../features";
import { Glyph } from "../components/icons";
import { Marquee, Reveal, SpotlightCard } from "../components/motion";
import { LANGUAGES, useI18n } from "../i18n";

export default function Landing() {
  const { t } = useI18n();
  const [m, setM] = useState<{ cropAccuracy: number | null; cropCount: number | null; leafClasses: number | null } | null>(null);
  useEffect(() => { api.modelSummary().then(setM).catch(() => {}); }, []);

  // real figures reported by the trained models (never hard-coded)
  const metrics: [string, string][] = [
    [m?.cropAccuracy ? `${(m.cropAccuracy * 100).toFixed(2)}%` : "–", t("mt_accuracy")],
    [m?.cropCount ? String(m.cropCount) : "–", t("mt_crops")],
    [m?.leafClasses ? String(m.leafClasses) : "–", t("mt_leaf")],
    [String(Object.keys(LANGUAGES).length), t("mt_langs")],
  ];
  const steps: [string, string][] = [[t("how1_t"), t("how1_d")], [t("how2_t"), t("how2_d")], [t("how3_t"), t("how3_d")]];

  return (
    <>
      <section className="hero relative my-6 overflow-hidden rounded-3xl p-6 ring-1 ring-amber-500/20 dark:ring-white/10 sm:p-8 md:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.35] [background-image:radial-gradient(circle,rgb(63_125_79/.25)_1px,transparent_1.5px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <mo.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <span className="eyebrow">{t("landing_eyebrow")}</span>
            <h1 className="!leading-[1.1]">{t("landing_title_1")} <span className="highlight">CropNexus</span></h1>
            <p className="lead mt-4">{t("landing_lead")}</p>
            <div className="row">
              <Link to="/signup" className="btn btn-primary btn-lg group">{t("landing_get_started")} <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" /></Link>
              <Link to="/login" className="btn btn-ghost btn-lg">{t("landing_login_cta")}</Link>
            </div>
            <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm font-medium text-slate-600 dark:text-slate-300">
              {[t("hero_b1"), t("hero_b2"), t("hero_b3")].map((b) => (
                <li key={b} className="flex items-center gap-1.5"><span className="grid size-5 place-items-center rounded-full bg-brand-600 text-white" aria-hidden="true"><Check className="size-3" strokeWidth={3} /></span>{b}</li>
              ))}
            </ul>
          </mo.div>
          <FarmScene />
        </div>
      </section>

      <LiveStats />

      <section aria-label="CropNexus in numbers">
        <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-lg shadow-brand-900/5 dark:border-white/10 dark:bg-white/10 md:grid-cols-4">
          {metrics.map(([v, l]) => (
            <div key={l} className="bg-white px-4 py-5 text-center dark:bg-slate-900">
              <dt className="order-2 text-xs font-medium uppercase tracking-wider text-slate-500">{l}</dt>
              <dd className="m-0 font-display text-3xl font-extrabold text-brand-700 dark:text-brand-300">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 rounded-2xl border border-slate-200/70 bg-white/60 py-4 dark:border-white/10 dark:bg-white/5">
        <Marquee label={t("landing_features_title")}>
          {FEATURES.map((f) => <span key={f.id} className="inline-flex items-center gap-2 whitespace-nowrap font-display text-sm font-semibold text-slate-700 dark:text-slate-200"><Glyph name={f.icon} className="size-4 text-brand-600 dark:text-brand-300" />{t(f.title)}</span>)}
        </Marquee>
      </div>

      <section aria-labelledby="features-h">
        <h2 id="features-h" className="text-center">{t("landing_features_title")}</h2>
        <FeatureSections />
      </section>

      <section aria-labelledby="how-h">
        <div className="text-center"><h2 id="how-h">{t("how_title")}</h2><p className="muted">{t("how_sub")}</p></div>
        <ol className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-3">
          {steps.map(([title, desc], i) => (
            <Reveal as="li" key={title} delay={i * 0.08}><SpotlightCard className="card relative h-full pt-10">
              <span className="absolute -top-5 left-6 grid size-11 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-display text-lg font-extrabold text-brand-950 shadow-lg ring-4 ring-[#F6F3E6] dark:ring-slate-950">{i + 1}</span>
              <h3 className="!mt-0">{title}</h3>
              <p className="muted text-sm leading-relaxed">{desc}</p>
            </SpotlightCard></Reveal>
          ))}
        </ol>
      </section>

      <Reviews />

      <section className="relative mt-16 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-brand-700 to-brand-600 p-10 text-center text-white shadow-xl shadow-brand-900/20 md:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-10 size-56 rounded-full bg-amber-400/20 blur-3xl" />
        <h2 className="relative !mt-0 !text-white">{t("cta_title")}</h2>
        <p className="relative mx-auto mb-6 max-w-xl text-brand-100">{t("cta_text")}</p>
        <Link to="/signup" className="btn relative bg-amber-400 !px-8 !py-3 !text-base !text-brand-950 shadow-lg hover:bg-amber-300">{t("landing_get_started")}</Link>
      </section>
    </>
  );
}
