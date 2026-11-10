import { AsYouType, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";
import { useMemo } from "react";
import CountrySelect from "./CountrySelect";
import { buildCountries } from "../data/countries";
import { useI18n } from "../i18n";

export interface PhoneValue { country: CountryCode; national: string }
export const toE164 = (v: PhoneValue) => parsePhoneNumberFromString(v.national, v.country);

/** Country selector + automatic dialing code + national number. Typing "+49…" switches the country automatically. */
export default function PhoneField({ value, onChange, error, disabled }: { value: PhoneValue; onChange: (v: PhoneValue) => void; error?: string; disabled?: boolean }) {
  const { t, lang } = useI18n();
  const countries = useMemo(() => buildCountries(lang), [lang]);
  const dial = countries.find((c) => c.code === value.country)?.dial ?? "";
  const parsed = toE164(value);
  const invalid = value.national.trim().length > 0 && !parsed?.isValid();

  function typed(raw: string) {
    if (raw.trim().startsWith("+")) {
      const p = parsePhoneNumberFromString(raw);
      if (p?.country) return onChange({ country: p.country, national: p.formatNational() });
    }
    onChange({ ...value, national: new AsYouType(value.country).input(raw) });
  }
  return (
    <div className={`field ${error || invalid ? "has-error" : ""}`}>
      <label htmlFor="phone-national">{t("auth_phone")}</label>
      <CountrySelect countries={countries} value={value.country} onChange={(code) => onChange({ country: code as CountryCode, national: "" })} />
      <div className="mt-2 flex items-stretch gap-2">
        <span aria-label={t("phone_dial")} className="grid min-w-16 place-items-center rounded-xl border border-slate-300 bg-slate-100 px-3 font-bold tabular-nums text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">{dial}</span>
        <input id="phone-national" type="tel" inputMode="tel" autoComplete="tel-national" disabled={disabled} value={value.national} onChange={(e) => typed(e.target.value)} placeholder={t("phone_national")} />
      </div>
      {(error || invalid) && <small className="err">{error || t("phone_invalid")}</small>}
    </div>
  );
}
