import { useI18n } from "../i18n";
import { Glyph } from "./icons";

/**
 * Flat (2-D) agricultural hero illustration: sun, hills, crop rows, barn, windmill and trees.
 * Fully static — no parallax, tilt, 3-D transforms or hover motion. No logo.
 */
export default function FarmScene() {
  const { t } = useI18n();
  const chips: [string, string][] = [["crop", t("nf_crop_t")], ["leaf", t("nf_leaf_t")], ["weather", t("nf_weather_t")]];
  return (
    <figure className="m-0 w-full max-w-[34rem] justify-self-center">
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-white shadow-xl shadow-brand-900/10 dark:border-white/10 dark:bg-slate-900">
        <svg viewBox="0 0 480 340" className="block h-auto w-full" role="img" aria-label="Illustration of a farm with crop rows, a barn, a windmill and trees under a bright sun">
          <defs>
            <linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#CFE4F2" /><stop offset="1" stopColor="#FBF3DC" /></linearGradient>
            <linearGradient id="fs-field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7DBB6A" /><stop offset="1" stopColor="#3F7D4F" /></linearGradient>
          </defs>
          <rect width="480" height="340" fill="url(#fs-sky)" />
          <circle cx="388" cy="70" r="46" fill="#F0C468" opacity=".28" /><circle cx="388" cy="70" r="30" fill="#F0C468" />
          <g fill="#fff" opacity=".95"><ellipse cx="96" cy="62" rx="34" ry="11" /><ellipse cx="122" cy="68" rx="24" ry="9" /><ellipse cx="250" cy="42" rx="28" ry="9" /></g>
          <path d="M0 176 Q90 128 190 168 T380 156 T480 170 V340 H0Z" fill="#9CCB8B" />
          <path d="M0 206 Q120 172 240 200 T480 196 V340 H0Z" fill="url(#fs-field)" />
          {/* crop rows */}
          {[0, 1, 2, 3, 4].map((r) => (
            <path key={r} d={`M0 ${236 + r * 20} Q120 ${222 + r * 20} 240 ${236 + r * 20} T480 ${232 + r * 20}`} fill="none" stroke={r % 2 ? "#E3A438" : "#2E6540"} strokeWidth="5" strokeLinecap="round" strokeDasharray="1 11" opacity=".9" />
          ))}
          {/* barn */}
          <g transform="translate(40 132)">
            <rect x="0" y="22" width="64" height="44" fill="#B5412F" /><path d="M-6 26 L32 -4 L70 26Z" fill="#8E2F22" />
            <rect x="21" y="38" width="22" height="28" fill="#F6E7C8" /><path d="M21 38 L43 66 M43 38 L21 66" stroke="#B5412F" strokeWidth="2" />
          </g>
          {/* windmill (static) */}
          <g transform="translate(398 128)">
            <path d="M0 0 L-9 62 H9Z" fill="#E9E3CF" stroke="#B9B196" strokeWidth="1.2" />
            <g stroke="#fff" strokeWidth="4" strokeLinecap="round"><line x1="0" y1="0" x2="0" y2="-34" /><line x1="0" y1="0" x2="34" y2="0" /><line x1="0" y1="0" x2="0" y2="34" /><line x1="0" y1="0" x2="-34" y2="0" /></g>
            <circle r="4" fill="#B9B196" />
          </g>
          {/* trees */}
          {[[150, 178], [176, 186], [330, 176]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}><rect x="-3" y="0" width="6" height="18" fill="#7A5230" /><circle cy="-6" r="16" fill="#3F7D4F" /><circle cx="-7" cy="-13" r="10" fill="#5FAE76" /></g>
          ))}
        </svg>
      </div>
      <ul className="m-0 mt-4 grid list-none grid-cols-2 gap-2 p-0 text-center" aria-hidden="true">
        {chips.map(([i, l]) => <li key={l} className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs whitespace-nowrap font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-white"><span className="inline-flex items-center gap-1.5"><Glyph name={i} className="size-3.5 text-brand-600 dark:text-brand-300" />{l}</span></li>)}
      </ul>
    </figure>
  );
}
