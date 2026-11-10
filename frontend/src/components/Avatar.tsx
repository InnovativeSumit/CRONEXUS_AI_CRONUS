import type { CSSProperties } from "react";

export const AVATARS = {
  male: [
    { id: "m1", skin: "#F1C9A5", hair: "#2B2118", shirt: "#3F7D4F", style: "short" },
    { id: "m2", skin: "#C98F63", hair: "#1A1410", shirt: "#E3A438", style: "beard" },
    { id: "m3", skin: "#8D5A3B", hair: "#0F0C0A", shirt: "#2E6540", style: "cap" },
  ],
  female: [
    { id: "f1", skin: "#F4D2B4", hair: "#6B3F1D", shirt: "#C6842A", style: "long" },
    { id: "f2", skin: "#D9A47A", hair: "#1A1410", shirt: "#3F7D4F", style: "bun" },
    { id: "f3", skin: "#9B6A47", hair: "#2B1A10", shirt: "#8F5BA8", style: "bob" },
  ],
} as const;
type Def = (typeof AVATARS.male)[number] | (typeof AVATARS.female)[number];
const ALL: Def[] = [...AVATARS.male, ...AVATARS.female];

function Preset({ d }: { d: Def }) {
  const long = d.style === "long", bob = d.style === "bob", bun = d.style === "bun";
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
      <rect width="100" height="100" fill="#DCEBD8" />
      <circle cx="82" cy="18" r="9" fill="#F0C468" opacity=".7" />
      {(long || bob) && <path d={bob ? "M26 52 Q24 24 50 22 Q76 24 74 52 Q74 62 68 64 L32 64 Q26 62 26 52Z" : "M24 58 Q20 22 50 20 Q80 22 76 58 L76 84 L24 84Z"} fill={d.hair} />}
      <path d="M18 100 Q18 72 50 70 Q82 72 82 100Z" fill={d.shirt} />
      <rect x="43" y="58" width="14" height="14" rx="5" fill={d.skin} />
      <ellipse cx="50" cy="42" rx="19" ry="21" fill={d.skin} />
      {bun && <circle cx="50" cy="16" r="9" fill={d.hair} />}
      {d.style === "cap" ? (
        <>
          <path d="M30 38 Q32 18 50 18 Q68 18 70 38Z" fill={d.hair} />
          <rect x="28" y="35" width="44" height="6" rx="3" fill="#1F4D2C" />
        </>
      ) : (
        <path d={long || bob ? "M31 40 Q34 24 50 23 Q66 24 69 40 Q58 30 31 40Z" : bun ? "M31 40 Q33 22 50 22 Q67 22 69 40 Q56 29 31 40Z" : "M31 38 Q33 21 50 21 Q67 21 69 38 Q60 28 50 29 Q40 28 31 38Z"} fill={d.hair} />
      )}
      <circle cx="43" cy="44" r="2" fill="#2B2118" /><circle cx="57" cy="44" r="2" fill="#2B2118" />
      <path d="M44 54 Q50 59 56 54" stroke="#7A3B2E" strokeWidth="2" fill="none" strokeLinecap="round" />
      {d.style === "beard" && <path d="M32 48 Q34 66 50 67 Q66 66 68 48 Q62 58 50 58 Q38 58 32 48Z" fill={d.hair} opacity=".92" />}
    </svg>
  );
}

interface Props { value?: string | null; name?: string; size?: number; className?: string; style?: CSSProperties }

/** Renders a preset avatar, an uploaded photo, or the user's initial. */
export default function Avatar({ value, name = "", size = 36, className = "", style }: Props) {
  const box = `inline-grid shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-brand-500/30 ${className}`;
  const dim = { width: size, height: size, ...style };
  if (value?.startsWith("preset:")) {
    const d = ALL.find((a) => a.id === value.slice(7));
    if (d) return <span className={box} style={dim} role="img" aria-label={name || "avatar"}><Preset d={d} /></span>;
  }
  if (value?.startsWith("data:image/")) return <img src={value} alt={name || "avatar"} className={`${box} object-cover`} style={dim} />;
  return (
    <span className={`${box} bg-gradient-to-br from-brand-700 to-brand-500 font-bold text-white`} style={{ ...dim, fontSize: size * 0.42 }} role="img" aria-label={name || "avatar"}>
      {(name.trim().charAt(0) || "?").toUpperCase()}
    </span>
  );
}
