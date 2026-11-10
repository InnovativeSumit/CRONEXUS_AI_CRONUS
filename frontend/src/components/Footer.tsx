import { Link } from "react-router-dom";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { useAuth } from "../auth";
import { FEATURES } from "../features";
import { useI18n } from "../i18n";
import { Glyph } from "./icons";

/** Navigation links and the copyright line only. */
export default function Footer() {
  const { t } = useI18n();
  const { user } = useAuth();
  const a = "group inline-flex items-center gap-2 text-sm text-brand-100/80 no-underline transition hover:text-white";
  const h = "!mt-0 !mb-4 !text-xs font-sans font-bold uppercase !tracking-[0.18em] !text-amber-300";
  return (
    <footer className="relative mt-20 overflow-hidden bg-gradient-to-b from-brand-900 to-brand-950 text-brand-100">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-0 size-96 rounded-full bg-brand-500/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-10 size-96 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="container relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_2fr_1fr]">
        <div>
          <Link to="/" className="flex items-center gap-3 font-display text-2xl font-extrabold text-white no-underline">
            <img src="/logo.png" alt="" className="size-11 rounded-full ring-2 ring-amber-400/70" /> CropNexus
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-100/80">{t("footer_tagline")}</p>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15">
            <ArrowUp className="size-4" aria-hidden="true" /> Back to top
          </button>
        </div>
        <nav aria-label={t("ft_features")}>
          <h3 className={h}>{t("ft_features")}</h3>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.id}>
                <Link className={a} to={f.path}>
                  <Glyph name={f.icon} className="size-4 text-amber-300/90 transition group-hover:scale-110" />
                  {t(f.title)}
                  <ArrowUpRight aria-hidden="true" className="size-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("ft_company")}>
          <h3 className={h}>{t("ft_company")}</h3>
          <ul className="m-0 grid list-none gap-3 p-0">
            <li><Link className={a} to="/">{t("nav_home")}</Link></li>
            <li><Link className={a} to="/about">{t("nav_about")}</Link></li>
            <li><Link className={a} to="/contact">{t("nav_contact")}</Link></li>
            {user ? <li><Link className={a} to="/profile">{t("nav_profile")}</Link></li>
              : <><li><Link className={a} to="/login">{t("nav_login")}</Link></li><li><Link className={a} to="/signup">{t("nav_signup")}</Link></li></>}
          </ul>
        </nav>
      </div>
      <div aria-hidden="true" className="select-none overflow-hidden text-center font-display text-[17vw] font-extrabold leading-[.8] tracking-tighter text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/.10)] lg:text-[11rem]">CropNexus</div>
      <div className="relative border-t border-white/10">
        <div className="container py-4 text-center text-xs font-medium text-brand-100/80">{t("ft_copy")}</div>
      </div>
    </footer>
  );
}
