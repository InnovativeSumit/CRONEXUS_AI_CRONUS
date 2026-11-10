import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { ErrorBox, Loading, Note, PageHeader, errMsg, useAsync } from "../components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Contact() {
  const { user } = useAuth();
  const info = useAsync(() => api.contactInfo(), []);
  const [f, setF] = useState({ name: user?.name ?? "", email: user?.email ?? "", subject: "", message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(""); const [done, setDone] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = "Enter your name.";
    if (!EMAIL_RE.test(f.email.trim())) er.email = "Enter a valid email address so we can reply.";
    if (f.subject.trim().length < 3) er.subject = "Enter a subject.";
    if (f.message.trim().length < 10) er.message = "Message must be at least 10 characters.";
    setErrors(er); setError("");
    if (Object.keys(er).length) return;
    setBusy(true);
    try { const r = await api.sendContact({ name: f.name.trim(), email: f.email.trim(), subject: f.subject.trim(), message: f.message.trim(), website: f.website }); setDone(r.message); setF({ ...f, subject: "", message: "" }); }
    catch (err) { if (err instanceof ApiError && err.fields) setErrors(err.fields); setError(errMsg(err)); } finally { setBusy(false); }
  }
  const c = info.data;
  const hasDetails = !!(c?.developerName || c?.developerPhone || c?.email);

  return (
    <>
      <PageHeader icon="✉️" title="Contact Us" lead="Questions, corrections or ideas? Send a message and we will get back to you." />
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <form className="card" onSubmit={submit} noValidate>
          {done && <div className="notice ok" role="status">✅ {done}</div>}
          <div className="grid gap-x-4 sm:grid-cols-2">
            <div className={`field ${errors.name ? "has-error" : ""}`}><label htmlFor="c-n">Your name</label><input id="c-n" autoComplete="name" value={f.name} onChange={set("name")} maxLength={80} required />{errors.name && <small className="err">{errors.name}</small>}</div>
            <div className={`field ${errors.email ? "has-error" : ""}`}><label htmlFor="c-e">Your email</label><input id="c-e" type="email" autoComplete="email" value={f.email} onChange={set("email")} maxLength={254} required />{errors.email && <small className="err">{errors.email}</small>}</div>
          </div>
          <div className={`field ${errors.subject ? "has-error" : ""}`}><label htmlFor="c-s">Subject</label><input id="c-s" value={f.subject} onChange={set("subject")} maxLength={120} required />{errors.subject && <small className="err">{errors.subject}</small>}</div>
          <div className={`field ${errors.message ? "has-error" : ""}`}><label htmlFor="c-m">Message</label><textarea id="c-m" rows={6} value={f.message} onChange={set("message")} maxLength={3000} required className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 dark:border-white/15 dark:bg-slate-950/70" />
            <small className="muted">{f.message.length} / 3000</small>{errors.message && <small className="err">{errors.message}</small>}</div>
          {/* Honeypot: hidden from people and screen readers; bots tend to fill it in. */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}><label>Leave this empty<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></label></div>
          {error && <div className="notice error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Sending…" : "Send message"}</button>
        </form>

        <aside className="card h-fit" aria-label="Contact details">
          <h2 className="!mt-0 !text-xl">Contact details</h2>
          {info.loading && !c ? <Loading /> : info.error && !c ? <ErrorBox message={info.error} onRetry={info.reload} /> : hasDetails ? (
            <dl className="m-0 grid gap-3 text-sm">
              {c?.developerName && <div><dt className="muted text-xs uppercase tracking-wide">Developer</dt><dd className="m-0 font-semibold">{c.developerName}</dd></div>}
              {c?.developerPhone && <div><dt className="muted text-xs uppercase tracking-wide">Phone</dt><dd className="m-0 font-semibold"><a href={`tel:${c.developerPhone.replace(/[^+\d]/g, "")}`}>{c.developerPhone}</a></dd></div>}
              {c?.email && <div><dt className="muted text-xs uppercase tracking-wide">Email</dt><dd className="m-0 font-semibold"><a href={`mailto:${c.email}`}>{c.email}</a></dd></div>}
            </dl>
          ) : <p className="muted m-0 text-sm">No public phone number or email address has been published for this site. Please use the form.</p>}
          {c && !c.emailForwarding && <Note kind="warn">Messages are saved on the server for the site owner to read; email forwarding is not configured.</Note>}
          <p className="muted mt-3 text-xs">Please do not send passwords or payment details in a message.</p>
        </aside>
      </div>
    </>
  );
}
