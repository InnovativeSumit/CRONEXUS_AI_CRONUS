import { useState } from "react";
import type { Rating } from "../api";
import { useI18n, type Messages } from "../i18n";

/** Interactive 1–5 star input: hover preview, click, and ←/→ (or 1–5) on the keyboard. */
export default function StarRating({ value, onChange }: { value: Rating | 0; onChange: (r: Rating) => void }) {
  const { t } = useI18n();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div role="radiogroup" aria-label={t("fb_rating")} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} / 5 — ${t(`fb_r${n}` as keyof Messages)}`}
            tabIndex={value === n || (!value && n === 1) ? 0 : -1}
            className={`star-btn ${n <= shown ? "on" : ""}`}
            onMouseEnter={() => setHover(n)} onFocus={() => setHover(0)} onClick={() => onChange(n)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(5, (value || 0) + 1) as Rating); }
              else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(1, (value || 2) - 1) as Rating); }
              else if (/^[1-5]$/.test(e.key)) onChange(Number(e.key) as Rating);
            }}>
            ★
          </button>
        ))}
        <span className="ml-3 min-w-24 text-sm font-semibold text-amber-700 dark:text-amber-300" aria-live="polite">{shown ? t(`fb_r${shown}` as keyof Messages) : t("fb_rating_hint")}</span>
      </div>
    </div>
  );
}
