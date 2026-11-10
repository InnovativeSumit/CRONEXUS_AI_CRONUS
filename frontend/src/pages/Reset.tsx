import AuthShell from "../components/AuthShell";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import PasswordInput from "../components/PasswordInput";
import { useI18n } from "../i18n";

export default function Reset() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setErrors({});
    if (password !== confirmPassword) { setErrors({ confirmPassword: t("auth_pw_mismatch") }); return; }
    setBusy(true);
    try {
      await api.reset({ token, password, confirmPassword });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.fields || {}); setError(err.code === "NETWORK" ? t("auth_err_network") : err.message); }
      else setError(t("common_error"));
    } finally { setBusy(false); }
  }
  return (
    <AuthShell><div className="card mx-auto w-full max-w-md p-8 shadow-2xl">
      <h1 className="text-center !text-3xl">{t("auth_reset_title")}</h1>
      <p className="muted mb-4 text-center">{t("auth_reset_subtitle")}</p>
      {done ? (
        <>
          <div className="notice ok">{t("auth_reset_done")}</div>
          <Link className="btn btn-primary btn-block" to="/login">{t("auth_login_button")}</Link>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <PasswordInput label={t("auth_new_password")} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint={t("auth_pw_hint")} required />
          <PasswordInput label={t("auth_confirm")} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirmPassword || (mismatch ? t("auth_pw_mismatch") : undefined)} required />
          {error && !Object.keys(errors).length && <div className="notice error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy || !token}>{busy ? t("auth_working") : t("auth_reset_button")}</button>
        </form>
      )}
      <p className="center small"><Link to="/login">{t("auth_back_login")}</Link></p>
    </div></AuthShell>
  );
}
