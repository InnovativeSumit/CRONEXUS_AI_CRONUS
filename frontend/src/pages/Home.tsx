import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ModelInfo } from "../api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import FarmScene from "../components/FarmScene";
import LiveStats from "../components/LiveStats";
import { ArrowUpRight } from "lucide-react";
import { FEATURES } from "../features";
import { Glyph } from "../components/icons";
import { Reveal, SpotlightCard } from "../components/motion";

export default function Home() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [info, setInfo] = useState<ModelInfo | null>(null);
  useEffect(() => { api.modelInfo().then(setInfo).catch(() => {}); }, []);
  const cm = info?.crop_model;
  return (
    <>
      <section className="my-6 grid items-center gap-10 rounded-3xl bg-gradient-to-br from-[#EFE9D6] via-[#F6F3E6] to-brand-100/70 p-8 ring-1 ring-amber-500/20 dark:from-slate-900 dark:via-slate-950 dark:to-brand-900/40 dark:ring-white/10 md:grid-cols-[1.2fr_1fr] md:p-12">
        <div>
          <span className="eyebrow">{t("nav_hello")}, {user?.name}</span>
          <h1>{t("home_title")} <span className="highlight">CropNexus</span></h1>
          <p className="lead mt-4">{t("home_lead")}</p>
          <div className="row">
            <Link to="/advisory" className="btn btn-primary">{t("home_cta_advisory")}</Link>
            <Link to="/leaf-disease" className="btn btn-ghost">{t("home_cta_leaf")}</Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-8 [&_b]:block [&_b]:font-display [&_b]:text-2xl [&_b]:text-brand-700 dark:[&_b]:text-brand-300 [&_span]:text-xs [&_span]:text-slate-500">
            <div><b>{cm?.test_accuracy ? `${(cm.test_accuracy * 100).toFixed(2)}%` : "–"}</b><span>{t("home_stat_accuracy")}</span></div>
            <div><b>{cm?.n_classes ?? "–"}</b><span>{t("home_stat_crops")}</span></div>
            <div><b>{cm?.final_model_name ?? "–"}</b><span>{t("home_stat_model")}</span></div>
          </div>
        </div>
        <FarmScene />
      </section>
      <LiveStats />
      <section aria-labelledby="home-features">
        <h2 id="home-features" className="!mt-10">{t("nav_all_features")}</h2>
        <ul className="m-0 mt-4 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal as="li" key={f.id} delay={(i % 3) * 0.06}>
              <SpotlightCard className="card h-full !p-0 transition-colors hover:border-brand-400">
              <Link to={f.path} className="group flex h-full items-start gap-4 p-5 no-underline">
                <span className="icon-tile"><Glyph name={f.icon} className="size-5" /></span>
                <span className="min-w-0">
                  <b className="flex items-center gap-1 font-display text-slate-900 group-hover:text-brand-700 dark:text-white">{t(f.title)}<ArrowUpRight aria-hidden="true" className="size-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" /></b>
                  <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{t(f.desc)}</span>
                </span>
              </Link>
              </SpotlightCard>
            </Reveal>
          ))}
        </ul>
      </section>
    </>
  );
}
