import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js/min";

export interface Country { code: CountryCode; name: string; dial: string }

/** All countries/regions with a calling code, names localised by the browser (Intl.DisplayNames). */
export function buildCountries(lang: string): Country[] {
  let names: Intl.DisplayNames | null = null;
  try { names = new Intl.DisplayNames([lang, "en"], { type: "region" }); } catch { /* very old browser */ }
  return getCountries()
    .map((code) => ({ code, name: names?.of(code) ?? code, dial: `+${getCountryCallingCode(code)}` }))
    .sort((a, b) => a.name.localeCompare(b.name, lang));
}

/** Best guess for the visitor's country from the browser locale (e.g. "en-IN" → IN). */
export function guessCountry(): CountryCode {
  const region = (navigator.languages?.[0] || navigator.language || "").split("-")[1]?.toUpperCase();
  return (region && (getCountries() as string[]).includes(region) ? region : "IN") as CountryCode;
}
