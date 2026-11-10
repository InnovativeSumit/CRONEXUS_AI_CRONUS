/** Inline SVG feature illustrations (no external images, themed to the CropNexus palette). */
const wrap = (children: React.ReactNode, id: string, from: string, to: string) => (
  <svg viewBox="0 0 400 260" className="size-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} /></linearGradient>
    </defs>
    <rect width="400" height="260" fill={`url(#bg-${id})`} />
    {children}
  </svg>
);

export function CropArt() {
  return wrap(
    <>
      <circle cx="320" cy="62" r="34" fill="#F0C468" /><circle cx="320" cy="62" r="52" fill="#F0C468" opacity=".25" />
      <path d="M0 150 Q100 120 200 145 T400 135 V260 H0Z" fill="#6FA86F" />
      <path d="M0 185 Q120 160 230 180 T400 170 V260 H0Z" fill="#3F7D4F" />
      <path d="M0 220 Q140 200 260 215 T400 208 V260 H0Z" fill="#1F4D2C" />
      {[40, 90, 140, 190, 240, 290, 340].map((x, i) => (
        <g key={x} transform={`translate(${x} ${196 + (i % 2) * 8})`}>
          <path d="M0 40 V0" stroke="#E3A438" strokeWidth="3" />
          {[0, 8, 16].map((y) => (<g key={y}><ellipse cx="-6" cy={y + 2} rx="5" ry="2.6" fill="#EDB04A" transform={`rotate(-30 -6 ${y + 2})`} /><ellipse cx="6" cy={y + 2} rx="5" ry="2.6" fill="#EDB04A" transform={`rotate(30 6 ${y + 2})`} /></g>))}
        </g>
      ))}
      <g transform="translate(60 52)" fill="#fff" opacity=".85"><ellipse cx="20" cy="14" rx="26" ry="10" /><ellipse cx="42" cy="18" rx="20" ry="8" /></g>
    </>, "crop", "#CFE4F2", "#F6F3E6");
}
export function FertilizerArt() {
  return wrap(
    <>
      <rect y="190" width="400" height="70" fill="#7A5230" /><rect y="190" width="400" height="10" fill="#9A6B40" />
      <path d="M200 190 V120" stroke="#3F7D4F" strokeWidth="6" strokeLinecap="round" />
      <path d="M200 150 Q165 140 158 108 Q192 112 200 150Z" fill="#6FA86F" /><path d="M200 130 Q238 124 248 92 Q210 94 200 130Z" fill="#3F7D4F" />
      <g transform="translate(70 70)">
        <path d="M30 0 h30 v34 l26 52 a10 10 0 0 1 -9 15 H13 a10 10 0 0 1 -9 -15 L30 34Z" fill="#fff" opacity=".9" stroke="#1F4D2C" strokeWidth="3" />
        <path d="M14 82 h62 l10 20 a6 6 0 0 1 -5 9 H9 a6 6 0 0 1 -5 -9Z" fill="#6FA86F" /><circle cx="30" cy="92" r="4" fill="#fff" opacity=".7" /><circle cx="52" cy="98" r="3" fill="#fff" opacity=".7" />
        <rect x="26" y="-6" width="38" height="8" rx="3" fill="#1F4D2C" />
      </g>
      {[[290, 80], [320, 120], [270, 130]].map(([x, y], i) => <g key={i} fill="#E3A438"><circle cx={x} cy={y} r="7" /><text x={x} y={y + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="#1E2A1C">{["N", "P", "K"][i]}</text></g>)}
    </>, "fert", "#F5E9C4", "#F6F3E6");
}
export function IrrigationArt() {
  return wrap(
    <>
      <rect y="200" width="400" height="60" fill="#3F7D4F" />
      {[30, 80, 130, 180, 230, 280, 330, 380].map((x) => <path key={x} d={`M${x} 200 q-6 -26 0 -40 q6 14 0 40`} fill="#6FA86F" />)}
      <rect x="196" y="120" width="8" height="80" fill="#4B5A45" /><rect x="180" y="108" width="40" height="16" rx="6" fill="#1F4D2C" />
      {[-60, -40, -20, 0, 20, 40, 60].map((a) => (
        <g key={a} transform={`rotate(${a} 200 112)`}><path d="M200 106 V40" stroke="#7FB5E0" strokeWidth="2.5" strokeDasharray="3 7" strokeLinecap="round" /><path d="M200 36 q-5 9 0 12 q5 -3 0 -12" fill="#7FB5E0" /></g>
      ))}
      <circle cx="330" cy="50" r="26" fill="#F0C468" /><circle cx="90" cy="60" r="3" fill="#7FB5E0" /><circle cx="110" cy="90" r="2" fill="#7FB5E0" />
    </>, "irr", "#D6E9F3", "#F6F3E6");
}
export function LeafArt() {
  return wrap(
    <>
      <path d="M200 40 C290 60 320 150 200 225 C80 150 110 60 200 40Z" fill="#3F7D4F" /><path d="M200 48 V220" stroke="#BBD7B4" strokeWidth="4" />
      {[80, 110, 140, 170].map((y) => <g key={y} stroke="#BBD7B4" strokeWidth="2.5" fill="none"><path d={`M200 ${y} q-34 8 -50 ${y > 120 ? 22 : 12}`} /><path d={`M200 ${y} q34 8 50 ${y > 120 ? 22 : 12}`} /></g>)}
      <circle cx="238" cy="140" r="13" fill="#7A5230" /><circle cx="168" cy="105" r="8" fill="#9A6B40" />
      <rect x="215" y="118" width="46" height="46" rx="6" fill="none" stroke="#E3A438" strokeWidth="3" strokeDasharray="8 5" />
      <rect x="60" y="188" width="280" height="4" rx="2" fill="#E3A438" opacity=".9" />
      <path d="M40 50 h26 M40 50 v26 M360 50 h-26 M360 50 v26 M40 210 h26 M40 210 v-26 M360 210 h-26 M360 210 v-26" stroke="#1F4D2C" strokeWidth="4" strokeLinecap="round" />
    </>, "leaf", "#E7F0DC", "#F6F3E6");
}

export function WeatherArt() {
  return wrap(
    <>
      <circle cx="120" cy="86" r="40" fill="#F0C468" /><circle cx="120" cy="86" r="62" fill="#F0C468" opacity=".25" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="120" y1="86" x2="120" y2="20" stroke="#F0C468" strokeWidth="5" strokeLinecap="round" transform={`rotate(${a} 120 86) translate(0 -2)`} opacity=".6" />)}
      <g fill="#fff"><ellipse cx="240" cy="110" rx="64" ry="30" /><ellipse cx="200" cy="124" rx="44" ry="24" /><ellipse cx="282" cy="126" rx="42" ry="22" /></g>
      {[[210, 160], [240, 172], [270, 160], [225, 195], [255, 200]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q-5 12 0 18 q5 -6 0 -18z`} fill="#4A9BD0" />)}
      <path d="M0 225 Q120 200 240 222 T400 214 V260 H0Z" fill="#3F7D4F" /><path d="M0 245 Q140 228 260 242 T400 236 V260 H0Z" fill="#1F4D2C" />
      <g transform="translate(310 50)"><rect width="56" height="22" rx="11" fill="#fff" opacity=".9" /><text x="28" y="16" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1F4D2C">31°C</text></g>
    </>, "wx", "#CFE4F2", "#F6F3E6");
}
export function CalendarArt() {
  return wrap(
    <>
      <rect x="70" y="36" width="260" height="196" rx="16" fill="#fff" stroke="#1F4D2C" strokeWidth="4" />
      <path d="M70 52a16 16 0 0 1 16-16h228a16 16 0 0 1 16 16v38H70z" fill="#3F7D4F" />
      <rect x="110" y="22" width="12" height="30" rx="6" fill="#E3A438" /><rect x="278" y="22" width="12" height="30" rx="6" fill="#E3A438" />
      {[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4, 5].map((c) => <rect key={`${r}${c}`} x={88 + c * 38} y={104 + r * 25} width="26" height="16" rx="4" fill={(r + c) % 7 === 0 ? "#E3A438" : (r * 3 + c) % 5 === 0 ? "#6FA86F" : "#EDE8D4"} />))}
      <path d="M232 168l9 9 17-20" fill="none" stroke="#1F4D2C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </>, "cal", "#E7F0DC", "#F6F3E6");
}
export function ProductsArt() {
  return wrap(
    <>
      <path d="M60 130h280l-20 100H80z" fill="#B98A5B" stroke="#7A5230" strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 130h280" stroke="#7A5230" strokeWidth="8" />
      <g transform="translate(92 54) rotate(-8)"><rect width="64" height="86" rx="8" fill="#fff" stroke="#1F4D2C" strokeWidth="3" /><rect y="14" width="64" height="26" fill="#6FA86F" /><circle cx="32" cy="62" r="11" fill="#E3A438" /></g>
      <g transform="translate(176 40)"><rect width="64" height="94" rx="8" fill="#fff" stroke="#1F4D2C" strokeWidth="3" /><rect y="16" width="64" height="26" fill="#E3A438" /><path d="M20 78q12-24 24 0" fill="none" stroke="#3F7D4F" strokeWidth="5" strokeLinecap="round" /></g>
      <g transform="translate(262 62) rotate(8)"><rect x="6" y="20" width="48" height="66" rx="10" fill="#4A9BD0" stroke="#1F4D2C" strokeWidth="3" /><rect x="22" width="16" height="22" rx="4" fill="#1F4D2C" /><path d="M54 8h26" stroke="#1F4D2C" strokeWidth="5" strokeLinecap="round" /></g>
    </>, "prod", "#F5E9C4", "#F6F3E6");
}
export function SoilArt() {
  return wrap(
    <>
      <rect y="110" width="400" height="38" fill="#7A5230" /><rect y="148" width="400" height="44" fill="#9A6B40" /><rect y="192" width="400" height="68" fill="#5C3B1F" />
      {[[50, 124], [130, 130], [210, 122], [300, 130], [350, 126]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#5C3B1F" opacity=".6" />)}
      <path d="M200 110V56" stroke="#3F7D4F" strokeWidth="6" strokeLinecap="round" /><path d="M200 84q-30-6-36-34 30 4 36 34z" fill="#6FA86F" /><path d="M200 70q32-4 40-32-34 2-40 32z" fill="#3F7D4F" />
      <g stroke="#E8D9B5" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M200 110v40M200 130l-26 36M200 130l24 40M200 150l-12 30M200 150l16 30" /></g>
      <g transform="translate(290 150)"><circle r="40" fill="#fff" opacity=".35" stroke="#1F4D2C" strokeWidth="6" /><path d="M30 30l36 36" stroke="#1F4D2C" strokeWidth="9" strokeLinecap="round" /></g>
      <circle cx="80" cy="54" r="26" fill="#F0C468" />
    </>, "soil", "#D6E9F3", "#F6F3E6");
}
export function ResourcesArt() {
  return wrap(
    <>
      <g transform="translate(50 40) rotate(-4)"><rect width="170" height="190" rx="10" fill="#fff" stroke="#1F4D2C" strokeWidth="4" /><rect x="14" y="16" width="142" height="26" rx="4" fill="#3F7D4F" />{[62, 82, 102, 122, 142, 162].map((y) => <rect key={y} x="14" y={y} width={y % 40 === 22 ? 96 : 142} height="8" rx="4" fill="#DDE7D5" />)}</g>
      <g transform="translate(220 60) rotate(5)"><rect width="140" height="170" rx="10" fill="#FBF3D8" stroke="#B8801F" strokeWidth="4" /><circle cx="70" cy="56" r="26" fill="#E3A438" stroke="#B8801F" strokeWidth="3" /><path d="M58 56l9 9 16-18" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />{[104, 124, 144].map((y) => <rect key={y} x="20" y={y} width="100" height="8" rx="4" fill="#E9D9A4" />)}</g>
    </>, "res", "#F5E9C4", "#F6F3E6");
}
