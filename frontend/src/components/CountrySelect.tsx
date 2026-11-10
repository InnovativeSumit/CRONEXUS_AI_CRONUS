import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Country } from "../data/countries";
import { useI18n } from "../i18n";

/** Accessible searchable combobox: type a country name, ISO code or dialing code; ↑/↓/Enter/Esc work. */
export default function CountrySelect({ countries, value, onChange }: { countries: Country[]; value: string; onChange: (code: string) => void }) {
  const { t } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = countries.find((c) => c.code === value);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^\+/, "");
    if (!s) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase() === s || c.dial.slice(1).startsWith(s));
  }, [q, countries]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active, open]);

  const pick = (c: Country) => { onChange(c.code); setOpen(false); setQ(""); };
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && open) { e.preventDefault(); if (results[active]) pick(results[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="relative" ref={root}>
      <input
        role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-label={t("country_label")}
        aria-activedescendant={open && results[active] ? `${id}-o${active}` : undefined}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 dark:border-white/15 dark:bg-slate-950/70 dark:text-slate-100"
        placeholder={open || !current ? t("country_search") : `${current.name} (${current.dial})`}
        value={open ? q : current ? `${current.name} (${current.dial})` : ""}
        onFocus={() => { setOpen(true); setQ(""); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={onKey} autoComplete="off"
      />
      {open && (
        <ul id={`${id}-list`} role="listbox" ref={listRef} className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-white/10 dark:bg-slate-900">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">{t("country_none")}</li>}
          {results.map((c, i) => (
            <li key={c.code} id={`${id}-o${i}`} data-i={i} role="option" aria-selected={c.code === value}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${i === active ? "bg-brand-100 dark:bg-white/10" : ""} ${c.code === value ? "font-bold" : ""}`}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(c); }}>
              <span className="flex items-center gap-2"><span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-700 dark:bg-white/10 dark:text-slate-200">{c.code}</span>{c.name}</span>
              <span className="tabular-nums text-slate-500">{c.dial}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
