import { useRef, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import Avatar, { AVATARS } from "../components/Avatar";
import { useI18n } from "../i18n";

/** Downsizes + center-crops a chosen photo to a 160×160 JPEG data URL so it stays small in MongoDB. */
async function resizePhoto(file: File, size = 160): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const side = Math.min(img.width, img.height);
    const c = document.createElement("canvas"); c.width = c.height = size;
    c.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
    return c.toDataURL("image/jpeg", 0.82);
  } finally { URL.revokeObjectURL(url); }
}

export default function Profile() {
  const { t, lang } = useI18n();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  if (!user) return null;
  const dirty = name.trim() !== user.name || avatar !== (user.avatar ?? null);

  async function onFile(f?: File) {
    if (!f) return;
    try { setAvatar(await resizePhoto(f)); setMsg(null); } catch { setMsg({ ok: false, text: t("pf_photo_err") }); }
    if (file.current) file.current.value = "";
  }
  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await api.updateProfile({ name: name.trim(), avatar });
      setUser(r.user); setMsg({ ok: true, text: t("pf_saved") });
    } catch (err) { setMsg({ ok: false, text: err instanceof ApiError ? err.message : t("common_error") }); } finally { setBusy(false); }
  }
  const isPhoto = avatar?.startsWith("data:image/");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="py-8 text-center"><Avatar value={avatar} name={name} size={104} className="!ring-4" style={{ margin: "0 auto 12px" }} /><h1 className="!text-3xl">{t("pf_title")}</h1><p className="muted mt-1">{t("pf_subtitle")}</p></div>
      <div className="card">
        <div className="field"><label htmlFor="pf-name">{t("pf_name")}</label><input id="pf-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></div>

        <fieldset className="mb-5 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">{t("pf_avatar")}</legend>
          {(["male", "female"] as const).map((g) => (
            <div key={g} className="mb-3">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{g === "male" ? t("pf_male") : t("pf_female")}</div>
              <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={g === "male" ? t("pf_male") : t("pf_female")}>
                {AVATARS[g].map((a) => {
                  const v = `preset:${a.id}`, sel = avatar === v;
                  return (
                    <button key={a.id} type="button" role="radio" aria-checked={sel} aria-label={`${g} ${a.id}`} onClick={() => setAvatar(v)}
                      className={`rounded-full p-1 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/70 ${sel ? "bg-amber-400" : "bg-transparent"}`}>
                      <Avatar value={v} size={64} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </fieldset>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          <button type="button" className="btn btn-ghost" onClick={() => file.current?.click()}>📷 {t("pf_upload")}</button>
          {isPhoto && <><Avatar value={avatar} name={t("pf_photo_label")} size={44} /><button type="button" className="btn btn-ghost btn-sm" onClick={() => setAvatar(null)}>{t("pf_remove")}</button></>}
          <small className="text-slate-500">{t("pf_photo_hint")}</small>
        </div>

        {msg && <div className={`notice ${msg.ok ? "ok" : "error"}`} role="status">{msg.text}</div>}
        <button className="btn btn-primary" onClick={save} disabled={busy || !dirty || name.trim().length < 2}>{busy ? t("auth_working") : t("pf_save")}</button>

        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-slate-200 pt-4 text-sm dark:border-white/10">
          <dt className="text-slate-500">{t("pf_email")}</dt><dd className="m-0 font-medium">{user.email}</dd>
          <dt className="text-slate-500">{t("pf_phone")}</dt><dd className="m-0 font-medium">{user.phone}</dd>
          {user.age !== null && <><dt className="text-slate-500">{t("pf_age")}</dt><dd className="m-0 font-medium">{user.age}</dd></>}
          <dt className="text-slate-500">{t("pf_since")}</dt><dd className="m-0 font-medium">{new Date(user.createdAt).toLocaleDateString(lang)}</dd>
        </dl>
      </div>
    </div>
  );
}
