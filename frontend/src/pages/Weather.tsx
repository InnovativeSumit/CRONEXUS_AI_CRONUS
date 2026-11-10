import { useState } from "react";
import { api, type Insight, type Place } from "../api";
import LocationPicker, { loadLocation } from "../components/LocationPicker";
import { Attribution, Empty, ErrorBox, Loading, Note, PageHeader, Tag, fmtDateTime, useAsync } from "../components/ui";

const dir = (d: number | null) => (d === null ? "" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(d / 45) % 8]);
const n0 = (v: number | null, u = "") => (v === null ? "–" : `${Math.round(v)}${u}`);
const n1 = (v: number | null, u = "") => (v === null ? "–" : `${v.toFixed(1)}${u}`);
const levelStyle: Record<Insight["level"], string> = {
  ok: "border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-100",
  watch: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
  warning: "border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100",
};
const levelIcon = { ok: "✅", watch: "👀", warning: "⚠️" } as const;

export default function Weather() {
  const [place, setPlace] = useState<Place | null>(() => loadLocation());
  const w = useAsync(() => (place ? api.weather(place.latitude, place.longitude) : Promise.resolve(null)), [place?.latitude, place?.longitude]);
  const f = w.data?.forecast;
  const u = f?.units;
  return (
    <>
      <PageHeader icon="⛅" title="Live Weather" lead="Current conditions and a 7-day forecast for your farm, with simple alerts for heat, frost, rain, wind and irrigation." />
      <LocationPicker onPick={setPlace} current={place} />
      {!place ? <Empty icon="📍" title="Choose your location">Search for your village, town or city — or use your device's location — to see the weather for your farm.</Empty>
        : w.loading && !w.data ? <Loading label="Loading weather…" />
        : w.error && !w.data ? <ErrorBox message={w.error} onRetry={w.reload} />
        : f && u && w.data ? (
          <>
            {(w.data.stale || w.error) && <Note kind="warn">The weather service could not be reached just now. The data below was last updated {fmtDateTime(f.fetchedAt)}.</Note>}
            <section className="card mb-5 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center" aria-label="Current conditions">
              <div className="flex items-center gap-4"><span className="text-6xl" aria-hidden="true">{f.current.icon}</span>
                <div><p className="m-0 font-display text-5xl font-extrabold">{n0(f.current.temperature, u.temperature)}</p><p className="m-0 font-medium">{f.current.label}</p><p className="muted m-0 text-sm">Feels like {n0(f.current.feelsLike, u.temperature)}</p></div></div>
              <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[["Humidity", n0(f.current.humidity, "%")], ["Rain now", n1(f.current.precipitation, ` ${u.precipitation}`)], ["Wind", `${n0(f.current.windSpeed, ` ${u.wind}`)} ${dir(f.current.windDirection)}`]].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-brand-50/70 p-3 dark:bg-white/5"><dt className="muted text-xs uppercase tracking-wide">{k}</dt><dd className="m-0 text-lg font-bold">{v}</dd></div>))}
              </dl>
              <p className="muted m-0 text-xs sm:col-span-2">Observed {fmtDateTime(f.current.time)} · Time zone {f.timezone}</p>
            </section>

            <h2 className="!mt-8 !text-2xl">7-day forecast</h2>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4" aria-label="Daily forecast">
              {f.daily.map((d, i) => (
                <li key={d.date} className="card !p-4">
                  <p className="m-0 text-sm font-semibold">{i === 0 ? "Today" : new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</p>
                  <p className="m-0 mt-1 flex items-center gap-2"><span className="text-3xl" aria-hidden="true">{d.icon}</span><span className="text-sm">{d.label}</span></p>
                  <p className="m-0 mt-1 text-lg font-bold">{n0(d.tmax, "°")} <span className="muted text-sm font-medium">/ {n0(d.tmin, "°")}</span></p>
                  <p className="muted m-0 text-xs">🌧 {n1(d.rain, ` ${u.precipitation}`)} · {n0(d.rainProb, "%")} chance</p>
                  <p className="muted m-0 text-xs">💨 up to {n0(d.windMax, ` ${u.wind}`)}</p>
                </li>))}
            </ul>

            <h2 className="!mt-8 !text-2xl">Farm insights <Tag>estimates</Tag></h2>
            <p className="muted text-sm">{w.data.note}</p>
            <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
              {w.data.insights.map((i) => (
                <li key={i.id} className={`rounded-2xl border p-4 ${levelStyle[i.level]}`}>
                  <p className="m-0 font-bold"><span aria-hidden="true">{levelIcon[i.level]}</span> {i.title}<span className="sr-only"> ({i.level})</span></p>
                  <p className="my-1 text-sm">{i.detail}</p><p className="m-0 text-xs opacity-75">How this is decided: {i.basis}</p>
                </li>))}
            </ul>
            <Attribution>{f.attribution}. Forecast issued {fmtDateTime(f.fetchedAt)}; forecasts change and can be wrong, especially for rainfall amounts and timing.</Attribution>
          </>
        ) : null}
    </>
  );
}
