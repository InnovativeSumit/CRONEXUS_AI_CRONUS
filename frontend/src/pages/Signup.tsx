import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CountryCode } from "libphonenumber-js/min";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import AgeChart from "../components/AgeChart";
import AuthShell from "../components/AuthShell";
import Field from "../components/Field";
import PasswordInput from "../components/PasswordInput";
import PhoneField, { toE164, type PhoneValue } from "../components/PhoneField";
import { guessCountry } from "../data/countries";
import { useI18n } from "../i18n";

const STEPS = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const pwScore = (p: string) => [p.length >= 8, /[a-z]/.test(p) && /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p) || p.length >= 12].filter(Boolean).length;

/**
 * Six-step registration: name → age (with live age chart) → email → mobile → password → confirm password.
 * There is no e-mail or SMS verification step; the server still validates everything again.
 */
export default function Signup() {
  const { t } = useI18n();
  const { signup } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: "", age: "", email: "", password: "", confirmPassword: "" });
  const [phone, setPhone] = useState<PhoneValue>(() => ({ country: guessCountry() as CountryCode, national: "" }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const ageNum = f.age.trim() === "" ? null : Number(f.age);
  const ageOk = ageNum !== null && Number.isInteger(ageNum) && ageNum >= 0 && ageNum <= 120;
  const email = f.email.trim().toLowerCase();
  const parsedPhone = useMemo(() => toE164(phone), [phone]);
  const phoneOk = !!parsedPhone?.isValid();
  const pwOk = f.password.length >= 8 && /[A-Za-z]/.test(f.password) && /\d/.test(f.password);
  const mismatch = f.confirmPassword.length > 0 && f.password !== f.confirmPassword;
  const match = f.confirmPassword.length > 0 && f.password === f.confirmPassword;
  const score = pwScore(f.password);

  /** Returns the error for one step (or "" when it is fine). */
  function check(n: number): Record<string, string> {
    if (n === 1 && f.name.trim().length < 2) return { name: t("reg_name_short") };
    if (n === 2 && !ageOk) return { age: t("reg_age_required") };
    if (n === 3 && !EMAIL_RE.test(email)) return { email: t("reg_email_invalid") };
    if (n === 4 && !phoneOk) return { phone: t("reg_mobile_invalid") };
    if (n === 5 && !pwOk) return { password: t("reg_pw_rules") };
    if (n === 6 && f.password !== f.confirmPassword) return { confirmPassword: t("auth_pw_mismatch") };
    return {};
  }

  function next(e: FormEvent) {
    e.preventDefault();
    setError("");
    const err = check(step);
    setErrors(err);
    if (Object.keys(err).length) return;
    if (step < STEPS) setStep(step + 1); else void submit();
  }

  async function submit() {
    // Re-check everything before sending; jump back to the first step that is wrong.
    for (let n = 1; n <= STEPS; n++) { const err = check(n); if (Object.keys(err).length) { setStep(n); setErrors(err); return; } }
    setBusy(true);
    try {
      await signup({ name: f.name.trim(), age: Number(f.age), email, country: phone.country, phone: parsedPhone!.number, password: f.password, confirmPassword: f.confirmPassword });
      nav("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const fe = err.fields || {};
        setErrors(fe);
        if (fe.name) setStep(1); else if (fe.age) setStep(2); else if (fe.email) setStep(3); else if (fe.phone) setStep(4); else if (fe.password) setStep(5);
        setError(err.code === "NETWORK" ? t("auth_err_network") : err.message);
      } else setError(t("common_error"));
    } finally { setBusy(false); }
  }

  const labels = [t("reg_s_name"), t("reg_s_age"), t("reg_s_email"), t("reg_s_mobile"), t("reg_s_password"), t("reg_s_confirm")];
  const hints = [t("reg_name_hint"), t("reg_age_hint"), t("reg_email_hint"), t("reg_mobile_hint"), t("reg_password_hint"), t("reg_confirm_hint")];
  const canNext = [!!f.name.trim(), !!f.age.trim(), !!f.email.trim(), !!phone.national.trim(), !!f.password, !!f.confirmPassword][step - 1];
  const strength = [t("reg_pw_weak"), t("reg_pw_weak"), t("reg_pw_fair"), t("reg_pw_good"), t("reg_pw_strong")][score];

  return (
    <AuthShell wide={step === 2}>
      <ol className="m-0 mb-5 flex list-none items-center justify-center gap-1.5 p-0 sm:gap-2" aria-label={`${t("reg_step")} ${step} ${t("reg_of")} ${STEPS}`}>
        {labels.map((label, i) => {
          const n = i + 1, done = n < step, cur = n === step;
          return (
            <li key={label} className="flex items-center gap-1.5 sm:gap-2" aria-current={cur ? "step" : undefined}>
              <span className={`grid size-7 place-items-center rounded-full text-xs font-bold sm:size-8 sm:text-sm ${done ? "bg-brand-600 text-white" : cur ? "bg-amber-400 text-brand-950 ring-4 ring-amber-400/30" : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>{done ? "✓" : n}</span>
              {n < STEPS && <span className={`h-0.5 w-2 rounded sm:w-5 ${done ? "bg-brand-600" : "bg-slate-300 dark:bg-white/15"}`} />}
            </li>
          );
        })}
      </ol>

      <div className={`grid items-stretch gap-5 ${step === 2 ? "md:grid-cols-2" : ""}`}>
        <form onSubmit={next} noValidate className="card p-6 shadow-2xl sm:p-8">
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step}>
            <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-amber-400 transition-[width] duration-300" style={{ width: `${(step / STEPS) * 100}%` }} />
          </div>
          <p className="eyebrow">{t("reg_step")} {step} {t("reg_of")} {STEPS} · {labels[step - 1]}</p>
          <h1 className="!text-2xl sm:!text-3xl">{step === 1 ? t("auth_signup_title") : labels[step - 1]}</h1>
          <p className="muted mb-4">{hints[step - 1]}</p>

          {step === 1 && <Field label={t("auth_name")} autoComplete="name" autoFocus value={f.name} onChange={set("name")} error={errors.name} maxLength={80} required />}
          {step === 2 && <Field label={t("reg_age")} type="number" inputMode="numeric" min={0} max={120} autoFocus value={f.age} onChange={set("age")} error={errors.age} required />}
          {step === 3 && <Field label={t("auth_email")} type="email" autoComplete="email" inputMode="email" placeholder="name@gmail.com" autoFocus value={f.email} onChange={set("email")} error={errors.email} maxLength={254} required />}
          {step === 4 && <PhoneField value={phone} onChange={setPhone} error={errors.phone} />}
          {step === 5 && (
            <>
              <PasswordInput label={t("auth_password")} autoComplete="new-password" autoFocus value={f.password} onChange={set("password")} error={errors.password} hint={t("reg_pw_rules")} required />
              {f.password && (
                <div className="-mt-2 mb-3" aria-live="polite">
                  <div className="flex gap-1" aria-hidden="true">{[1, 2, 3, 4].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= score ? (score <= 1 ? "bg-red-500" : score === 2 ? "bg-amber-500" : "bg-brand-500") : "bg-slate-200 dark:bg-white/10"}`} />)}</div>
                  <small className="muted">{strength}</small>
                </div>
              )}
            </>
          )}
          {step === 6 && <PasswordInput label={t("auth_confirm")} autoComplete="new-password" autoFocus value={f.confirmPassword} onChange={set("confirmPassword")} error={errors.confirmPassword || (mismatch ? t("auth_pw_mismatch") : undefined)} hint={match ? "✓ " + t("auth_pw_match") : undefined} required />}

          {error && <div className="notice error" role="alert">{error}</div>}
          <div className="mt-3 flex gap-3">
            {step > 1 && <button type="button" className="btn btn-ghost" onClick={() => { setStep(step - 1); setErrors({}); setError(""); }}>← {t("reg_back")}</button>}
            <button className="btn btn-primary flex-1" disabled={busy || !canNext}>
              {busy ? t("auth_working") : step === STEPS ? t("reg_register") : `${t("reg_continue")} →`}
            </button>
          </div>
          <p className="mt-4 text-center text-sm">{t("auth_have_account")} <Link to="/login">{t("auth_login_link")}</Link></p>
        </form>
        {step === 2 && <AgeChart age={ageOk ? ageNum : null} />}
      </div>
    </AuthShell>
  );
}
