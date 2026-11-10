import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { LANGUAGES, useI18n, type Lang } from "../i18n";
import { useTheme } from "../theme";
import { FEATURES } from "../features";
import { m } from "motion/react";
import { ChevronDown, LogOut, Menu, Moon, Star, Sun, UserRound, X, Lock } from "lucide-react";
import Avatar from "./Avatar";
import { Glyph } from "./icons";

const link = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${isActive ? "text-brand-800 dark:text-brand-200" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-brand-300"}`;
/** Active-page marker: a pill that glides between links (shared layout animation). */
const Pill = () => <m.span layoutId="nav-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 -z-10 rounded-lg bg-brand-100/80 dark:bg-brand-500/20" />;
const item = (to: string, label: string, onClick: () => void, end = false) => (
  <NavLink to={to} end={end} className={link} onClick={onClick}>{({ isActive }) => <>{isActive && <Pill />}{label}</>}</NavLink>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  // Features dropdown: open by hover (desktop mouse), by keyboard focus, or pinned by a click/tap (phones, tablets, touch).
  const [hov, setHov] = useState(false);
  const [foc, setFoc] = useState(false);
  const [pin, setPin] = useState(false);
  const feat = hov || foc || pin;
  const [menuLeft, setMenuLeft] = useState(0);
  const skipFocus = useRef(false); // set while we move focus programmatically (Escape) so it does not re-open the panel
  const featRef = useRef<HTMLDivElement>(null);
  const featBtn = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const [headH, setHeadH] = useState(96);
  // The header is position:fixed, so a spacer of the same (measured) height keeps content from hiding under it.
  useLayoutEffect(() => {
    const el = headRef.current; if (!el) return;
    const apply = () => { setHeadH(el.offsetHeight); document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`); };
    const ro = new ResizeObserver(apply);
    ro.observe(el); apply();
    return () => ro.disconnect();
  }, []);
  const nav = useNavigate();
  const closeFeat = () => { setHov(false); setFoc(false); setPin(false); };
  const close = () => { setOpen(false); setMenu(false); closeFeat(); };

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menu]);

  useEffect(() => {
    if (!feat) return;
    const onDown = (e: MouseEvent | TouchEvent) => { if (!featRef.current?.contains(e.target as Node)) closeFeat(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { closeFeat(); skipFocus.current = true; featBtn.current?.focus(); skipFocus.current = false; } };
    document.addEventListener("mousedown", onDown); document.addEventListener("touchstart", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); document.removeEventListener("keydown", onKey); };
  }, [feat]);

  // keep the desktop panel inside the viewport (centred under the button, clamped to 16px margins)
  useLayoutEffect(() => {
    if (!feat) return;
    const wrap = featRef.current, btn = featBtn.current; if (!wrap || !btn) return;
    const w = Math.min(560, window.innerWidth - 32);
    const b = btn.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    const left = Math.min(Math.max(b.left + b.width / 2 - w / 2, 16), window.innerWidth - w - 16);
    setMenuLeft(left - wr.left);
  }, [feat, lang]);

  const hoverCapable = () => typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (min-width: 768px)").matches;
  const items = () => Array.from(featRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  function onFeatKey(e: ReactKeyEvent) {
    const list = items(); if (!list.length) return;
    const i = list.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => { e.preventDefault(); list[(n + list.length) % list.length].focus(); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
  }

  return (
    <>
    {/* Desktop: the bar sits at the top of the page and scrolls away with it (position:absolute).
          Mobile: it is attached flush to the top edge of the screen and stays there while scrolling (position:fixed). */}
    <header ref={headRef} className="fixed inset-x-0 top-0 z-40 md:absolute md:px-3 md:pt-3">
      <div className="container glass relative flex items-center gap-2 !px-3 py-2 max-md:!max-w-none max-md:rounded-none max-md:border-x-0 max-md:border-t-0 max-md:shadow-md md:rounded-2xl sm:!px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-extrabold sm:gap-2.5 sm:text-xl text-brand-800 no-underline dark:text-brand-100" onClick={close}>
          <img src="/logo.png" alt="" className="size-9 rounded-full object-cover ring-2 ring-amber-400/60 sm:size-10" /> <span>CropNexus</span>
        </Link>
        <button className="icon-btn order-3 ml-auto !size-11 shrink-0 md:!hidden" aria-label={t("nav_menu")} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        <nav className={`${open ? "flex" : "hidden"} md:order-2 md:ml-auto absolute inset-x-0 top-full mt-0 max-h-[calc(100svh-var(--header-h,4rem))] flex-col items-stretch gap-1 overflow-y-auto border-b border-slate-200 bg-white p-3 shadow-2xl max-md:rounded-none dark:border-white/10 dark:bg-slate-900 md:static md:mt-0 md:max-h-none md:overflow-visible md:flex md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-1 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none dark:md:bg-transparent`}>
          {user && item("/", t("nav_home"), close, true)}
          <div className="relative" ref={featRef}
            onMouseEnter={() => hoverCapable() && setHov(true)} onMouseLeave={() => hoverCapable() && setHov(false)}
            onFocus={(e) => { if (!skipFocus.current && (e.target as HTMLElement).matches?.(":focus-visible")) setFoc(true); }}
            onBlur={(e) => { if (!featRef.current?.contains(e.relatedTarget as Node | null)) { setFoc(false); setPin(false); } }}
            onKeyDown={onFeatKey}>
            <button ref={featBtn} type="button" aria-haspopup="true" aria-expanded={feat} aria-controls="features-menu"
              className="flex min-h-10 cursor-pointer items-center gap-1 rounded-lg border-0 bg-transparent px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 aria-expanded:bg-brand-50 aria-expanded:text-brand-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-brand-300 dark:aria-expanded:bg-white/5 dark:aria-expanded:text-brand-300 max-md:w-full max-md:justify-between"
              onClick={() => { if (pin || foc) closeFeat(); else setPin(true); }}
              onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setFoc(true); setTimeout(() => items()[0]?.focus(), 0); } }}>
              {t("nav_features")} <ChevronDown aria-hidden="true" className={`size-4 transition-transform duration-200 ${feat ? "rotate-180" : ""}`} />
            </button>
            {/* the panel is flush with the button (no hover gap); the transparent top padding bridges the pointer path */}
            <div data-open={feat} style={{ left: menuLeft }}
              className="hidden data-[open=true]:block md:absolute md:top-full md:block md:w-[min(35rem,calc(100vw-2rem))] md:pt-2 md:invisible md:opacity-0 md:translate-y-1 md:transition md:duration-150 md:data-[open=true]:visible md:data-[open=true]:translate-y-0 md:data-[open=true]:opacity-100 z-50">
              <m.ul id="features-menu" role="menu" aria-label={t("nav_features")} initial={false} animate={feat ? "open" : "closed"} variants={{ open: { transition: { staggerChildren: 0.025 } }, closed: {} }}
                className="m-0 grid list-none gap-0.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-brand-900/15 max-md:mt-1 max-md:shadow-none md:grid-cols-2 dark:border-white/10 dark:bg-slate-900">
                {FEATURES.map((f) => (
                  <m.li key={f.id} role="none" variants={{ open: { opacity: 1, y: 0 }, closed: { opacity: 0, y: 6 } }} transition={{ duration: 0.18 }}>
                    <Link role="menuitem" to={f.path} onClick={close} className="group flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm no-underline transition hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:hover:bg-white/5 dark:focus-visible:bg-white/5">
                      <span className="icon-tile !size-10"><Glyph name={f.icon} className="size-5" /></span>
                      <span className="min-w-0">
                        <b className="block text-slate-800 dark:text-slate-100">{t(f.title)}{f.auth && !user && <span className="ml-1.5 inline-block align-middle" title={t("nf_login_needed")}><Lock aria-hidden="true" className="size-3 text-amber-600" /><span className="sr-only"> {t("nf_login_needed")}</span></span>}</b>
                        <span className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{t(f.desc)}</span>
                      </span>
                    </Link>
                  </m.li>
                ))}
              </m.ul>
            </div>
          </div>
          {user && item("/history", t("nav_history"), close)}
          {item("/about", t("nav_about"), close)}
          {item("/contact", t("nav_contact"), close)}
          <select className="rounded-lg border border-slate-300 bg-white/80 px-2 py-1.5 text-sm text-slate-700 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200" aria-label={t("language_label")} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="icon-btn overflow-hidden" onClick={toggle} aria-label={t("theme_toggle")} title={t("theme_toggle")}><m.span key={theme} initial={{ rotate: -80, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="grid place-items-center">{theme === "dark" ? <Sun className="size-[18px] text-amber-400" /> : <Moon className="size-[18px]" />}</m.span></button>
          {user ? (
            <div className="relative" ref={menuRef}>
              <button className="flex items-center gap-2 rounded-full border border-slate-300 bg-white/70 py-1 pl-1 pr-3 text-sm font-medium hover:border-brand-500 dark:border-white/15 dark:bg-white/5" aria-haspopup="menu" aria-expanded={menu} aria-label={t("nav_account")} onClick={() => setMenu(!menu)}>
                <Avatar value={user.avatar} name={user.name} size={30} />
                <span className="max-w-24 truncate">{user.name.split(" ")[0]}</span> <ChevronDown aria-hidden="true" className="size-3.5" />
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
                  <div className="flex items-center gap-3 border-b border-slate-200 p-3 dark:border-white/10">
                    <Avatar value={user.avatar} name={user.name} size={40} />
                    <div className="min-w-0 leading-tight"><b className="block truncate text-sm">{user.name}</b><small className="block truncate text-slate-500">{user.email}</small></div>
                  </div>
                  <Link role="menuitem" to="/profile" onClick={close} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 no-underline hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-white/5"><UserRound className="size-4" /> {t("nav_profile")}</Link>
                  <Link role="menuitem" to="/feedback" onClick={close} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 no-underline hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-white/5"><Star className="size-4" /> {t("nav_feedback")}</Link>
                  <button role="menuitem" className="flex w-full cursor-pointer items-center gap-2.5 border-t border-slate-200 bg-transparent px-4 py-2.5 text-left text-sm text-red-700 hover:bg-red-50 dark:border-white/10 dark:text-red-300 dark:hover:bg-red-500/10" onClick={async () => { close(); await logout(); nav("/login"); }}><LogOut className="size-4" /> {t("nav_logout")}</button>
                </div>
              )}
            </div>
          ) : null}
        </nav>
        {!user && (
          <div className="order-2 ml-auto flex items-center gap-2 md:order-3 md:ml-0 max-md:mr-0">
            <Link to="/login" className="btn btn-ghost whitespace-nowrap !min-h-10 !px-3 !py-2 !text-sm sm:!min-h-12 sm:!px-7 sm:!text-base" onClick={close}>{t("nav_login")}</Link>
            <Link to="/signup" className="btn btn-primary whitespace-nowrap !min-h-10 !px-3 !py-2 !text-sm sm:!min-h-12 sm:!px-7 sm:!text-base" onClick={close}>{t("nav_signup")}</Link>
          </div>
        )}
      </div>
    </header>
    <div aria-hidden="true" className="md:hidden" style={{ height: headH }} />
    <div aria-hidden="true" className="hidden md:block" style={{ height: headH + 8 }} />
    </>
  );
}
