import type { DailyWeather } from "./weather.js";

/**
 * Irrigation planning with the FAO-56 crop-coefficient method:  ETc = Kc × ET0.
 * ET0 (reference evapotranspiration, FAO-56 Penman-Monteith) comes from Open-Meteo's forecast.
 * Kc values and stage lengths are the typical figures from FAO Irrigation & Drainage Paper 56 (Tables 11-12, 22);
 * they vary with climate and variety, so every result is an ESTIMATE, not a measurement of field moisture.
 */
export interface CropParams { name: string; kcIni: number; kcMid: number; kcEnd: number; stages: [number, number, number, number]; rootM: number; mad: number }

// stages = [initial, development, mid-season, late-season] days
export const CROPS: Record<string, CropParams> = {
  rice: { name: "Rice", kcIni: 1.05, kcMid: 1.2, kcEnd: 0.9, stages: [30, 30, 60, 30], rootM: 0.5, mad: 0.2 },
  wheat: { name: "Wheat", kcIni: 0.3, kcMid: 1.15, kcEnd: 0.25, stages: [20, 25, 60, 30], rootM: 1.2, mad: 0.55 },
  maize: { name: "Maize", kcIni: 0.3, kcMid: 1.2, kcEnd: 0.35, stages: [20, 35, 40, 30], rootM: 1.0, mad: 0.55 },
  cotton: { name: "Cotton", kcIni: 0.35, kcMid: 1.15, kcEnd: 0.7, stages: [30, 50, 55, 45], rootM: 1.3, mad: 0.65 },
  soybean: { name: "Soybean", kcIni: 0.4, kcMid: 1.15, kcEnd: 0.5, stages: [15, 15, 40, 15], rootM: 0.6, mad: 0.5 },
  groundnut: { name: "Groundnut", kcIni: 0.4, kcMid: 1.15, kcEnd: 0.6, stages: [25, 35, 45, 25], rootM: 0.5, mad: 0.5 },
  sorghum: { name: "Sorghum", kcIni: 0.3, kcMid: 1.0, kcEnd: 0.55, stages: [20, 35, 40, 30], rootM: 1.0, mad: 0.55 },
  millet: { name: "Millet", kcIni: 0.3, kcMid: 1.0, kcEnd: 0.3, stages: [15, 25, 40, 25], rootM: 1.0, mad: 0.55 },
  chickpea: { name: "Chickpea", kcIni: 0.4, kcMid: 1.0, kcEnd: 0.35, stages: [20, 30, 40, 20], rootM: 0.6, mad: 0.5 },
  potato: { name: "Potato", kcIni: 0.5, kcMid: 1.15, kcEnd: 0.75, stages: [25, 30, 45, 30], rootM: 0.4, mad: 0.35 },
  tomato: { name: "Tomato", kcIni: 0.6, kcMid: 1.15, kcEnd: 0.8, stages: [30, 40, 40, 25], rootM: 0.7, mad: 0.4 },
  onion: { name: "Onion", kcIni: 0.7, kcMid: 1.05, kcEnd: 0.75, stages: [15, 25, 70, 40], rootM: 0.3, mad: 0.3 },
  sugarcane: { name: "Sugarcane", kcIni: 0.4, kcMid: 1.25, kcEnd: 0.75, stages: [35, 60, 190, 120], rootM: 1.2, mad: 0.65 },
  banana: { name: "Banana", kcIni: 0.5, kcMid: 1.1, kcEnd: 1.0, stages: [120, 90, 120, 60], rootM: 0.8, mad: 0.35 },
};

/** Approximate total available water (mm per metre of soil depth), typical textbook ranges (mid-points). */
export const SOILS: Record<string, { name: string; awcMmPerM: number }> = {
  sandy: { name: "Sandy", awcMmPerM: 80 },
  sandy_loam: { name: "Sandy loam", awcMmPerM: 120 },
  loam: { name: "Loam", awcMmPerM: 170 },
  clay_loam: { name: "Clay loam", awcMmPerM: 180 },
  clay: { name: "Clay", awcMmPerM: 190 },
  black: { name: "Black (vertisol)", awcMmPerM: 190 },
};

export function kcFor(c: CropParams, dayOfCycle: number): { kc: number; stage: "initial" | "development" | "mid-season" | "late-season" } {
  const [a, b, m, l] = c.stages;
  const d = Math.max(1, dayOfCycle);
  if (d <= a) return { kc: c.kcIni, stage: "initial" };
  if (d <= a + b) return { kc: c.kcIni + ((d - a) / b) * (c.kcMid - c.kcIni), stage: "development" };
  if (d <= a + b + m) return { kc: c.kcMid, stage: "mid-season" };
  const t = Math.min(1, (d - a - b - m) / l);
  return { kc: c.kcMid + t * (c.kcEnd - c.kcMid), stage: "late-season" };
}

export interface PlanInput { crop: string; soil: string; plantingDate?: string; stageDay?: number; moisturePct?: number; days: DailyWeather[]; today: string; method?: "flood" | "sprinkler" | "drip" }
export interface PlanDay { date: string; et0: number; kc: number; etc: number; rain: number; effectiveRain: number; depletionMm: number; irrigate: boolean; irrigateMm: number }
export interface Plan {
  crop: string; soil: string; stage: string; dayOfCycle: number; takMm: number; rawMm: number; startDepletionMm: number; efficiency: number;
  days: PlanDay[]; nextIrrigation: { date: string; netMm: number; grossMm: number } | null; weekNetMm: number; weekGrossMm: number;
  assumptions: string[]; tips: string[];
}

const EFF = { flood: 0.6, sprinkler: 0.75, drip: 0.9 } as const;
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400_000);

export function plan(input: PlanInput): Plan {
  const crop = CROPS[input.crop], soil = SOILS[input.soil];
  if (!crop) throw new RangeError("Unsupported crop");
  if (!soil) throw new RangeError("Unsupported soil");
  const assumptions: string[] = [];
  let startDay: number;
  if (input.plantingDate) startDay = dayDiff(input.today, input.plantingDate) + 1;
  else if (input.stageDay) startDay = input.stageDay;
  else { startDay = Math.round(crop.stages[0] + crop.stages[1] + 5); assumptions.push("No planting date or growth stage was given, so the crop is assumed to be at the start of mid-season."); }
  if (startDay < 1) startDay = 1;
  const total = crop.stages.reduce((a, b) => a + b, 0);
  if (startDay > total) assumptions.push(`The planting date implies day ${startDay}, beyond the typical ${total}-day cycle for ${crop.name}; late-season Kc is used.`);

  const tam = soil.awcMmPerM * crop.rootM; // total available water in the root zone (mm)
  const raw = tam * crop.mad;               // readily available water before stress (mm)
  const mpct = input.moisturePct;
  let depletion: number;
  if (typeof mpct === "number") depletion = tam * (1 - Math.min(100, Math.max(0, mpct)) / 100);
  else { depletion = raw * 0.5; assumptions.push("No soil-moisture reading was given, so the root zone is assumed to be about 25% of the way to the stress point today."); }
  const startDepletion = depletion;

  const eff = EFF[input.method ?? "sprinkler"];
  const rows: PlanDay[] = [];
  let next: Plan["nextIrrigation"] = null;
  let weekNet = 0;
  input.days.forEach((d, i) => {
    const { kc } = kcFor(crop, startDay + i);
    const et0 = d.et0 ?? 0;
    const etc = et0 * kc;
    const rain = d.rain ?? 0;
    const effRain = rain < 2 ? 0 : rain * 0.8; // light showers (<2 mm) are assumed lost to evaporation; otherwise 80% is effective
    depletion = Math.max(0, depletion + etc - effRain);
    let irrigate = false, mm = 0;
    if (depletion >= raw) { irrigate = true; mm = Math.round(depletion); weekNet += mm; if (!next) next = { date: d.date, netMm: mm, grossMm: Math.round(mm / eff) }; depletion = 0; }
    if (depletion > tam) depletion = tam;
    rows.push({ date: d.date, et0: round1(et0), kc: round2(kc), etc: round1(etc), rain: round1(rain), effectiveRain: round1(effRain), depletionMm: Math.round(depletion), irrigate, irrigateMm: mm });
  });
  assumptions.push("Effective rain = 80% of daily rain ≥2 mm; no runoff, deep percolation or capillary rise is modelled.", `Root depth ${crop.rootM} m; allowed depletion ${Math.round(crop.mad * 100)}% of available water; soil holds ≈${soil.awcMmPerM} mm/m (typical value for ${soil.name.toLowerCase()} — your field may differ).`, `Application efficiency ${Math.round(eff * 100)}% (${input.method ?? "sprinkler"}).`);
  const st = kcFor(crop, startDay);
  const tips = [
    "Irrigate in the early morning or evening to reduce evaporation losses.",
    "If rain above ~10 mm is forecast within 24 hours, postpone irrigation and re-check the plan.",
    input.method === "drip" ? "Drip irrigation applies water near the roots and typically wastes the least." : "Switching to drip or sprinkler irrigation can cut water use compared with flooding.",
    "Mulching reduces soil evaporation and keeps the root zone cooler.",
    "Verify with a soil-moisture probe or the finger test (water at 10–15 cm depth) before irrigating.",
  ];
  return { crop: crop.name, soil: soil.name, stage: st.stage, dayOfCycle: startDay, takMm: Math.round(tam), rawMm: Math.round(raw), startDepletionMm: Math.round(startDepletion), efficiency: eff, days: rows, nextIrrigation: next, weekNetMm: weekNet, weekGrossMm: Math.round(weekNet / eff), assumptions, tips };
}
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
