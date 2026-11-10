import type { Http } from "./http.js";
import { TtlCache, UpstreamError } from "./http.js";

export interface Place { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string }
export interface DailyWeather { date: string; code: number; tmax: number | null; tmin: number | null; rain: number | null; rainProb: number | null; et0: number | null; windMax: number | null }
export interface Forecast {
  latitude: number; longitude: number; timezone: string; fetchedAt: string;
  current: { time: string; temperature: number | null; feelsLike: number | null; humidity: number | null; precipitation: number | null; windSpeed: number | null; windDirection: number | null; code: number | null };
  daily: DailyWeather[];
  units: { temperature: string; wind: string; precipitation: string; et0: string };
  attribution: string;
}
export interface Insight { id: "heat" | "frost" | "rain" | "wind" | "irrigation"; level: "ok" | "watch" | "warning"; title: string; detail: string; basis: string }

const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FC = "https://api.open-meteo.com/v1/forecast";
const forecastCache = new TtlCache<Forecast>(10 * 60_000);
const geoCache = new TtlCache<Place[]>(24 * 3600_000);
export const ATTRIBUTION = "Weather data by Open-Meteo.com (CC BY 4.0)";

export async function searchPlaces(http: Http, q: string): Promise<Place[]> {
  const key = q.trim().toLowerCase();
  const hit = geoCache.get(key);
  if (hit) return hit.value;
  const r = await http.getJson<{ results?: any[] }>(`${GEO}?name=${encodeURIComponent(q.trim())}&count=8&language=en&format=json`);
  const out: Place[] = (r.results ?? []).map((p) => ({ name: p.name, admin1: p.admin1, country: p.country, latitude: p.latitude, longitude: p.longitude, timezone: p.timezone }));
  geoCache.set(key, out);
  return out;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function getForecast(http: Http, lat: number, lon: number): Promise<{ forecast: Forecast; cached: boolean; stale: boolean }> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = forecastCache.get(key);
  if (hit) return { forecast: hit.value, cached: true, stale: false };
  const url = `${FC}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration,wind_speed_10m_max&timezone=auto&forecast_days=7`;
  let j: any;
  try {
    j = await http.getJson(url);
  } catch (e) {
    const old = forecastCache.stale(key);
    if (old) return { forecast: old.value, cached: true, stale: true };
    throw e;
  }
  if (!j?.daily?.time || !j?.current) throw new UpstreamError("The weather provider returned incomplete data.");
  const d = j.daily;
  const forecast: Forecast = {
    latitude: j.latitude, longitude: j.longitude, timezone: j.timezone, fetchedAt: new Date().toISOString(),
    current: {
      time: j.current.time, temperature: num(j.current.temperature_2m), feelsLike: num(j.current.apparent_temperature), humidity: num(j.current.relative_humidity_2m),
      precipitation: num(j.current.precipitation), windSpeed: num(j.current.wind_speed_10m), windDirection: num(j.current.wind_direction_10m), code: num(j.current.weather_code),
    },
    daily: d.time.map((date: string, i: number): DailyWeather => ({
      date, code: num(d.weather_code?.[i]) ?? 0, tmax: num(d.temperature_2m_max?.[i]), tmin: num(d.temperature_2m_min?.[i]), rain: num(d.precipitation_sum?.[i]),
      rainProb: num(d.precipitation_probability_max?.[i]), et0: num(d.et0_fao_evapotranspiration?.[i]), windMax: num(d.wind_speed_10m_max?.[i]),
    })),
    units: { temperature: "°C", wind: "km/h", precipitation: "mm", et0: "mm/day" },
    attribution: ATTRIBUTION,
  };
  forecastCache.set(key, forecast);
  return { forecast, cached: false, stale: false };
}

/**
 * Rule-based agricultural indicators from the 7-day forecast.
 * These are simple threshold rules (NOT a crop-specific model and NOT guaranteed predictions).
 */
export function agroInsights(days: DailyWeather[]): Insight[] {
  const out: Insight[] = [];
  const maxT = Math.max(...days.map((d) => d.tmax ?? -99));
  const minT = Math.min(...days.map((d) => d.tmin ?? 99));
  const rain = days.reduce((n, d) => n + (d.rain ?? 0), 0);
  const maxRainDay = Math.max(...days.map((d) => d.rain ?? 0));
  const wind = Math.max(...days.map((d) => d.windMax ?? 0));
  const et0 = days.reduce((n, d) => n + (d.et0 ?? 0), 0);

  out.push(maxT >= 40 ? { id: "heat", level: "warning", title: "Heat stress likely", detail: `Maximum temperature may reach ${maxT.toFixed(0)}°C. Many crops suffer above ~35–40°C; consider irrigating in the cooler hours and avoiding spraying at midday.`, basis: "Threshold rule: ≥40°C warning, ≥35°C watch." }
    : maxT >= 35 ? { id: "heat", level: "watch", title: "Hot spell possible", detail: `Highs up to ${maxT.toFixed(0)}°C. Heat-sensitive crops at flowering may be affected.`, basis: "Threshold rule: ≥40°C warning, ≥35°C watch." }
    : { id: "heat", level: "ok", title: "No heat stress indicated", detail: `Highs stay below 35°C (max ${maxT.toFixed(0)}°C).`, basis: "Threshold rule: ≥40°C warning, ≥35°C watch." });
  out.push(minT <= 0 ? { id: "frost", level: "warning", title: "Frost risk", detail: `Lows of ${minT.toFixed(0)}°C are forecast. Protect young seedlings and frost-sensitive crops.`, basis: "Threshold rule: ≤0°C warning, ≤4°C watch (air temperature; ground frost can occur earlier)." }
    : minT <= 4 ? { id: "frost", level: "watch", title: "Cold nights", detail: `Lows down to ${minT.toFixed(0)}°C — ground frost is possible in open fields.`, basis: "Threshold rule: ≤0°C warning, ≤4°C watch (air temperature; ground frost can occur earlier)." }
    : { id: "frost", level: "ok", title: "No frost indicated", detail: `Lows stay above 4°C (min ${minT.toFixed(0)}°C).`, basis: "Threshold rule: ≤0°C warning, ≤4°C watch." });
  out.push(maxRainDay >= 50 ? { id: "rain", level: "warning", title: "Heavy rain expected", detail: `Up to ${maxRainDay.toFixed(0)} mm in a day (${rain.toFixed(0)} mm over 7 days). Check drainage and delay fertiliser/pesticide application.`, basis: "Threshold rule: ≥50 mm/day warning, ≥20 mm/day watch." }
    : maxRainDay >= 20 ? { id: "rain", level: "watch", title: "Significant rain", detail: `Up to ${maxRainDay.toFixed(0)} mm in a day (${rain.toFixed(0)} mm total).`, basis: "Threshold rule: ≥50 mm/day warning, ≥20 mm/day watch." }
    : { id: "rain", level: "ok", title: "Rainfall", detail: `${rain.toFixed(0)} mm expected over the next 7 days.`, basis: "Sum of forecast daily precipitation." });
  out.push(wind >= 40 ? { id: "wind", level: "watch", title: "Strong winds", detail: `Gusty days up to ${wind.toFixed(0)} km/h — avoid spraying and secure tall or staked crops.`, basis: "Threshold rule: ≥40 km/h watch (spray drift is a concern above ~15 km/h)." }
    : { id: "wind", level: "ok", title: "Wind", detail: `Max ${wind.toFixed(0)} km/h.`, basis: "Threshold rule: ≥40 km/h watch." });
  const deficit = et0 - rain;
  out.push(deficit > 25 ? { id: "irrigation", level: "watch", title: "Irrigation likely needed", detail: `Estimated crop-water demand (reference ET₀ ${et0.toFixed(0)} mm) exceeds forecast rain (${rain.toFixed(0)} mm) by ~${deficit.toFixed(0)} mm this week.`, basis: "Weekly balance: reference evapotranspiration (FAO-56 Penman-Monteith via Open-Meteo) minus forecast rain. Not crop-specific — see Water Management." }
    : { id: "irrigation", level: "ok", title: "Water balance", detail: `Reference ET₀ ${et0.toFixed(0)} mm vs forecast rain ${rain.toFixed(0)} mm this week.`, basis: "Weekly balance: ET₀ minus forecast rain. Not crop-specific." });
  return out;
}

/** WMO weather interpretation codes → label + emoji. */
export function describeCode(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear sky", icon: "☀️" };
  if (code <= 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "Rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "🌨️" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", icon: "🌦️" };
  if (code === 85 || code === 86) return { label: "Snow showers", icon: "🌨️" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Unknown", icon: "🌡️" };
}
