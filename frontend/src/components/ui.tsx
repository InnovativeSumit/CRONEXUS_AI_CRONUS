import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError } from "../api";
import { Glyph } from "./icons";

export const errMsg = (e: unknown): string =>
  e instanceof ApiError ? (e.code === "NETWORK" ? "Cannot reach the server. Check your connection and that the CropNexus server is running." : e.message) : "Something went wrong. Please try again.";

/** Runs an async loader; exposes data / loading / error and a reload(). Ignores results of stale requests. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, set] = useState<{ data: T | null; loading: boolean; error: string }>({ data: null, loading: true, error: "" });
  const run = useRef(0);
  const load = useCallback(() => {
    const id = ++run.current;
    set((s) => ({ ...s, loading: true, error: "" }));
    fn().then((data) => { if (id === run.current) set({ data, loading: false, error: "" }); })
      .catch((e) => { if (id === run.current) set((s) => ({ data: s.data, loading: false, error: errMsg(e) })); });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); return () => { run.current++; }; }, [load]);
  return { ...state, reload: load };
}

export function PageHeader({ icon, eyebrow, title, lead, children }: { icon?: string; eyebrow?: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 mt-8">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="!text-3xl sm:!text-4xl">{icon && <span className="mr-3 inline-grid size-11 place-items-center rounded-xl bg-brand-100 align-middle text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"><Glyph name={icon} className="size-6" /></span>}{title}</h1>
      <span aria-hidden="true" className="mt-3 block h-1 w-14 rounded-full bg-gradient-to-r from-brand-600 to-amber-400" />
      {lead && <p className="lead mt-3">{lead}</p>}
      {children}
    </header>
  );
}

export function Loading({ label = "Loading…", lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="card my-4">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="grid gap-3">
        <div className="skeleton h-6 w-1/3" />
        {Array.from({ length: lines }, (_, i) => <div key={i} className="skeleton h-4" style={{ width: `${92 - i * 14}%` }} />)}
      </div>
    </div>
  );
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="notice error flex flex-wrap items-center justify-between gap-3" role="alert"><span>⚠ {message}</span>{onRetry && <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button>}</div>;
}
export function Empty({ icon = "🌱", title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return <div className="card center p-10"><div aria-hidden="true" className="mx-auto mb-2 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"><Glyph name={icon} className="size-7" /></div><h3 className="!mb-1">{title}</h3>{children && <div className="muted mx-auto max-w-xl text-sm">{children}</div>}</div>;
}
export function Note({ kind = "warn", children }: { kind?: "warn" | "ok" | "error"; children: ReactNode }) {
  return <div className={`notice ${kind}`} role={kind === "error" ? "alert" : "note"}>{children}</div>;
}
/** Small "this is an estimate/assumption" marker. */
export function Tag({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "green" | "slate" | "red" }) {
  const c = { amber: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200", green: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300", slate: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300", red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${c}`}>{children}</span>;
}
export const Attribution = ({ children }: { children: ReactNode }) => <p className="muted mt-3 text-xs">{children}</p>;

export const inr = (n: number | null | undefined) => (n === null || n === undefined ? "–" : `₹${Math.round(n).toLocaleString("en-IN")}`);
export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "–";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T00:00:00" : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
export const fmtDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function useDebounced<T>(value: T, ms = 350): T {
  const [v, set] = useState(value);
  useEffect(() => { const id = setTimeout(() => set(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return v;
}

/** Responsive SVG line chart with hover/focus tooltip and a screen-reader data table. */
export function LineChart({ points, unit = "", height = 220, label }: { points: { x: string; y: number }[]; unit?: string; height?: number; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, L = 52, R = 14, T = 14, B = 28;
  if (points.length < 2) return null;
  const ys = points.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const X = (i: number) => L + (i / (points.length - 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const path = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(" ");
  const area = `${path} L${X(points.length - 1).toFixed(1)} ${H - B} L${L} ${H - B}Z`;
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const xl = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const h = hover !== null ? points[hover] : null;
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(((px - L) / (W - L - R)) * (points.length - 1)))));
  };
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-pan-y" role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs><linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3F7D4F" stopOpacity=".35" /><stop offset="1" stopColor="#3F7D4F" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((v, i) => <g key={i}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="currentColor" strokeOpacity=".12" /><text x={L - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity=".65">{Math.round(v).toLocaleString("en-IN")}</text></g>)}
        {xl.map((i, k) => <text key={i} x={X(i)} y={H - 8} textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"} fontSize="11" fill="currentColor" opacity=".65">{fmtDate(points[i].x)}</text>)}
        <path d={area} fill="url(#lc-fill)" /><path d={path} fill="none" stroke="#2E6540" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.length <= 40 && points.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.y)} r="3" fill="#E3A438" />)}
        {h && hover !== null && (
          <g pointerEvents="none">
            <line x1={X(hover)} x2={X(hover)} y1={T} y2={H - B} stroke="currentColor" strokeOpacity=".35" strokeDasharray="4 3" />
            <circle cx={X(hover)} cy={Y(h.y)} r="5" fill="#E3A438" stroke="#fff" strokeWidth="2" />
            <g transform={`translate(${Math.min(Math.max(X(hover) - 62, L), W - R - 124)} ${T})`}><rect width="124" height="38" rx="8" fill="#1E2A1C" opacity=".92" /><text x="10" y="16" fontSize="11" fill="#fff" opacity=".8">{fmtDate(h.x)}</text><text x="10" y="31" fontSize="13" fontWeight="700" fill="#fff">{Math.round(h.y).toLocaleString("en-IN")} {unit}</text></g>
          </g>
        )}
      </svg>
      <table className="sr-only"><caption>{label}</caption><thead><tr><th>Date</th><th>Value {unit}</th></tr></thead><tbody>{points.map((p) => <tr key={p.x}><td>{p.x}</td><td>{p.y}</td></tr>)}</tbody></table>
    </figure>
  );
}

/** Accessible tab list (roving tabindex, arrow keys). Panels are rendered by the caller. */
export function Tabs<T extends string>({ tabs, value, onChange, label, idBase }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void; label: string; idBase: string }) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = tabs.length; let j = -1;
    if (e.key === "ArrowRight") j = (i + 1) % n; else if (e.key === "ArrowLeft") j = (i - 1 + n) % n; else if (e.key === "Home") j = 0; else if (e.key === "End") j = n - 1;
    if (j >= 0) { e.preventDefault(); onChange(tabs[j].id); document.getElementById(`${idBase}-tab-${tabs[j].id}`)?.focus(); }
  };
  return (
    <div role="tablist" aria-label={label} className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
      {tabs.map((t, i) => (
        <button key={t.id} id={`${idBase}-tab-${t.id}`} role="tab" type="button" aria-selected={value === t.id} aria-controls={`${idBase}-panel`} tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)} onKeyDown={(e) => onKey(e, i)}
          className={`min-h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-0 px-4 py-2 text-sm font-semibold transition ${value === t.id ? "bg-brand-600 text-white shadow" : "bg-transparent text-slate-600 hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-white/10"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
