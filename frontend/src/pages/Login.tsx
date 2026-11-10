import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { getCooldownUntil, setCooldownUntil, useAuth } from "../auth";
import Field from "../components/Field";
import AuthShell from "../components/AuthShell";
import PasswordInput from "../components/PasswordInput";
import { useI18n } from "../i18n";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((getCooldownUntil() - Date.now()) / 1000)));

  // Countdown for the 3-minute post-logout cooldown.
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setInterval(() => {
      const s = Math.max(0, Math.ceil((getCooldownUntil() - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) setCooldownUntil(0);
    }, 500);
    return () => clearInterval(id);
  }, [left > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await login(email, password);
      nav(loc.state?.from || "/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "LOGIN_COOLDOWN" && err.retryAfterSeconds) {
        setCooldownUntil(Date.now() + err.retryAfterSeconds * 1000);
        setLeft(err.retryAfterSeconds);
      } else setError(err instanceof ApiError ? (err.code === "NETWORK" ? t("auth_err_network") : err.message) : t("common_error"));
    } finally { setBusy(false); }
  }

  return (
    <AuthShell>
    <div className="card mx-auto w-full max-w-md p-8 shadow-2xl">
      <img src="/logo.png" alt="" className="mx-auto mb-3 size-16 rounded-full ring-4 ring-brand-500/20" />
      <h1 className="text-center !text-3xl">{t("auth_login_title")}</h1>
      <p className="muted mb-4 text-center">{t("auth_login_subtitle")}</p>
      {left > 0 && (
        <div className="notice warn" role="status">
          <b>⏳ {t("auth_cooldown_title")}</b>
          <p>{t("auth_cooldown_msg")}</p>
          <p>{t("auth_cooldown_wait")} <span className="countdown">{fmt(left)}</span></p>
        </div>
      )}
      <form onSubmit={submit} noValidate>
        <Field label={t("auth_email")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordInput label={t("auth_password")} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="notice error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy || left > 0 || !email || !password}>{busy ? t("auth_working") : left > 0 ? `${t("auth_login_button")} (${fmt(left)})` : t("auth_login_button")}</button>
      </form>
      <p className="center small"><Link to="/forgot-password">{t("auth_forgot")}</Link></p>
      <p className="center small">{t("auth_no_account")} <Link to="/signup">{t("auth_signup_link")}</Link></p>
    </div>
    </AuthShell>
  );
}
