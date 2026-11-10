import AuthShell from "../components/AuthShell";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { api, ApiError, type AuthConfig } from "../api";
import Field from "../components/Field";
import { useI18n } from "../i18n";

export default function Forgot() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [cfg, setCfg] = useState<AuthConfig | null>(null);
  useEffect(() => { api.authConfig().then(setCfg).catch(() => {}); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await api.forgot(email);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? (err.code === "NETWORK" ? t("auth_err_network") : err.message) : t("common_error"));
    } finally { setBusy(false); }
  }
  return (
    <AuthShell><div className="card mx-auto w-full max-w-md p-8 shadow-2xl">
      <h1 className="text-center !text-3xl">{t("auth_forgot_title")}</h1>
      <p className="muted mb-4 text-center">{t("auth_forgot_subtitle")}</p>
      {done ? (
        <>
          <div className="notice ok">{t("auth_forgot_done")}</div>
          {cfg?.emailDelivery === "console" && <div className="notice warn text-sm">{t("ver_dev_notice")}</div>}
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <Field label={t("auth_email")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <div className="notice error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy || !email}>{busy ? t("auth_working") : t("auth_forgot_button")}</button>
        </form>
      )}
      <p className="center small"><Link to="/login">{t("auth_back_login")}</Link></p>
    </div></AuthShell>
  );
}
