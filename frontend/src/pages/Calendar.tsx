import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api, TASK_CATEGORIES, type Priority, type Task, type TaskInput, type TaskStatus } from "../api";
import { Empty, ErrorBox, Loading, PageHeader, Tabs, Tag, addDays, errMsg, fmtDate, todayISO, useAsync } from "../components/ui";

const PRIORITY: Record<Priority, { label: string; chip: string; dot: string }> = {
  1: { label: "Priority 1 · High", chip: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200", dot: "bg-red-500" },
  2: { label: "Priority 2 · Medium", chip: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100", dot: "bg-amber-500" },
  3: { label: "Priority 3 · Low", chip: "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-100", dot: "bg-brand-500" },
};
const CAT_ICON: Record<string, string> = { sowing: "🌱", irrigation: "💧", fertilization: "🧪", pesticide: "🧴", harvesting: "🌾", maintenance: "🛠️", other: "📌" };
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const EMPTY: TaskInput = { title: "", description: "", dueDate: todayISO(), priority: 2, category: "other" };

export default function CalendarPage() {
  const today = todayISO();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [status, setStatus] = useState<TaskStatus>("all");
  const [priority, setPriority] = useState<"" | "1" | "2" | "3">("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<{ id: string | null; data: TaskInput } | null>(null);
  const [toast, setToast] = useState("");

  const list = useAsync(() => api.tasks({ status, priority: priority ? Number(priority) : undefined, from: from || undefined, to: to || undefined, today }), [status, priority, from, to, today]);
  const items = list.data?.items ?? [];
  const byDay = useMemo(() => { const m = new Map<string, Task[]>(); for (const t of items) (m.get(t.dueDate) ?? m.set(t.dueDate, []).get(t.dueDate)!).push(t); return m; }, [items]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  async function toggle(t: Task) { try { await api.updateTask(t.id, { completed: !t.completed }); list.reload(); } catch (e) { flash(errMsg(e)); } }
  async function remove(t: Task) { if (!confirm(`Delete “${t.title}”?`)) return; try { await api.deleteTask(t.id); list.reload(); flash("Task deleted."); } catch (e) { flash(errMsg(e)); } }
  async function reschedule(t: Task, days: number) { try { await api.updateTask(t.id, { dueDate: addDays(t.dueDate < today ? today : t.dueDate, days) }); list.reload(); } catch (e) { flash(errMsg(e)); } }
  const openNew = (date?: string) => setEditing({ id: null, data: { ...EMPTY, dueDate: date ?? (view === "calendar" ? selected : todayISO()) } });
  const openEdit = (t: Task) => setEditing({ id: t.id, data: { title: t.title, description: t.description, dueDate: t.dueDate, priority: t.priority, category: t.category } });

  const sum = list.data?.summary;
  const taskCard = (t: Task) => (
    <li key={t.id} className={`rounded-xl border p-3 ${PRIORITY[t.priority].chip} ${t.completed ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 size-5 shrink-0 cursor-pointer accent-brand-600" checked={t.completed} onChange={() => toggle(t)} aria-label={`Mark “${t.title}” ${t.completed ? "not done" : "done"}`} />
        <div className="min-w-0 flex-1">
          <p className={`m-0 font-semibold ${t.completed ? "line-through" : ""}`}><span aria-hidden="true">{CAT_ICON[t.category]}</span> {t.title}</p>
          {t.description && <p className="m-0 mt-0.5 whitespace-pre-line text-sm opacity-90">{t.description}</p>}
          <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span>📅 {fmtDate(t.dueDate)}</span><span>{PRIORITY[t.priority].label}</span><span className="capitalize">{t.category}</span>{t.overdue && <Tag tone="red">Overdue</Tag>}{t.completed && <Tag tone="green">Done</Tag>}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>✏️ Edit</button>
        {!t.completed && <><button type="button" className="btn btn-ghost btn-sm" onClick={() => reschedule(t, 1)}>+1 day</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => reschedule(t, 7)}>+1 week</button></>}
        <button type="button" className="btn btn-ghost btn-sm !text-red-700 dark:!text-red-300" onClick={() => remove(t)}>🗑 Delete</button>
      </div>
    </li>
  );

  // calendar grid
  const first = new Date(month.y, month.m, 1), lead = first.getDay(), dim = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const shift = (n: number) => setMonth(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const dayTasks = byDay.get(selected) ?? [];

  return (
    <>
      <PageHeader icon="🗓️" title="Crop Calendar" lead="Plan sowing, irrigation, fertilising, spraying and harvest. Your tasks are saved to your account." />
      {sum && (
        <dl className="m-0 mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Open", sum.open], ["Due today", sum.dueToday], ["Overdue", sum.overdue], ["Done", sum.done]].map(([k, v]) => (
            <div key={k} className={`card !p-3 ${k === "Overdue" && Number(v) > 0 ? "!border-red-300" : ""}`}><dt className="muted text-xs uppercase tracking-wide">{k}</dt><dd className="m-0 font-display text-2xl font-extrabold">{v}</dd></div>))}
        </dl>
      )}
      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div className="field !mb-0"><label htmlFor="f-status">Status</label><select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>{[["all", "All"], ["open", "Open"], ["upcoming", "Upcoming"], ["overdue", "Overdue"], ["done", "Completed"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field !mb-0"><label htmlFor="f-pr">Priority</label><select id="f-pr" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}><option value="">Any</option><option value="1">1 · High</option><option value="2">2 · Medium</option><option value="3">3 · Low</option></select></div>
        <div className="field !mb-0"><label htmlFor="f-from">From</label><input id="f-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="field !mb-0"><label htmlFor="f-to">To</label><input id="f-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
        {(status !== "all" || priority || from || to) && <button type="button" className="btn btn-ghost" onClick={() => { setStatus("all"); setPriority(""); setFrom(""); setTo(""); }}>Clear filters</button>}
        <button type="button" className="btn btn-primary ml-auto" onClick={() => openNew()}>＋ New task</button>
      </div>
      <Tabs idBase="cal" label="Calendar views" value={view} onChange={setView} tabs={[{ id: "calendar", label: "Calendar" }, { id: "list", label: "List" }]} />
      {toast && <div className="notice ok" role="status">{toast}</div>}

      <div id="cal-panel" role="tabpanel" aria-labelledby={`cal-tab-${view}`}>
        {list.loading && !list.data ? <Loading /> : list.error && !list.data ? <ErrorBox message={list.error} onRetry={list.reload} /> : view === "list" ? (
          items.length === 0 ? <Empty icon="🗓️" title="No tasks to show">{status !== "all" || priority || from || to ? "No task matches these filters." : "Add your first task — for example “Sow wheat” or “First irrigation”."}<div className="mt-3"><button type="button" className="btn btn-primary" onClick={() => openNew()}>＋ New task</button></div></Empty>
            : <ul className="m-0 grid list-none gap-3 p-0">{items.map(taskCard)}</ul>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="card" aria-label="Month calendar">
              <div className="mb-3 flex items-center justify-between gap-2">
                <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
                <h2 className="!m-0 !text-xl" aria-live="polite">{new Date(month.y, month.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
                <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month">›</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500" aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}</div>
              <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label="Days">
                {cells.map((d, i) => {
                  if (d === null) return <div key={i} role="gridcell" aria-hidden="true" />;
                  const iso = ymd(month.y, month.m, d), ts = byDay.get(iso) ?? [], sel = iso === selected, isToday = iso === today;
                  return (
                    <button key={i} type="button" role="gridcell" aria-selected={sel} aria-label={`${fmtDate(iso)}${ts.length ? `, ${ts.length} task${ts.length > 1 ? "s" : ""}` : ""}${isToday ? ", today" : ""}`}
                      onClick={() => setSelected(iso)} className={`flex min-h-14 cursor-pointer flex-col items-center rounded-lg border p-1 text-sm transition sm:min-h-16 ${sel ? "border-brand-600 bg-brand-100 dark:bg-brand-500/20" : "border-slate-200 bg-white/70 hover:border-brand-400 dark:border-white/10 dark:bg-white/5"} ${isToday ? "ring-2 ring-amber-400" : ""}`}>
                      <span className="font-semibold">{d}</span>
                      <span className="mt-auto flex flex-wrap justify-center gap-0.5">{ts.slice(0, 4).map((t) => <span key={t.id} className={`size-2 rounded-full ${t.completed ? "bg-slate-400" : PRIORITY[t.priority].dot}`} />)}{ts.length > 4 && <span className="text-[9px] leading-none">+{ts.length - 4}</span>}</span>
                    </button>
                  );
                })}
              </div>
              <p className="muted m-0 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">{([1, 2, 3] as Priority[]).map((p) => <span key={p} className="flex items-center gap-1"><span className={`size-2.5 rounded-full ${PRIORITY[p].dot}`} />{PRIORITY[p].label}</span>)}<span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-slate-400" />Done</span></p>
            </section>
            <section aria-label={`Tasks on ${fmtDate(selected)}`}>
              <div className="mb-2 flex items-center justify-between"><h2 className="!m-0 !text-xl">{fmtDate(selected)}</h2><button type="button" className="btn btn-primary btn-sm" onClick={() => openNew(selected)}>＋ Add</button></div>
              {dayTasks.length ? <ul className="m-0 grid list-none gap-3 p-0">{dayTasks.map(taskCard)}</ul> : <p className="muted card">Nothing planned for this day.</p>}
            </section>
          </div>
        )}
      </div>
      {editing && <TaskDialog key={editing.id ?? "new"} initial={editing} onClose={() => setEditing(null)} onSaved={(m) => { setEditing(null); list.reload(); flash(m); }} />}
    </>
  );
}

function TaskDialog({ initial, onClose, onSaved }: { initial: { id: string | null; data: TaskInput }; onClose: () => void; onSaved: (m: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [d, setD] = useState<TaskInput>(initial.data);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { const el = ref.current; if (el && !el.open) el.showModal(); }, []);
  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setD({ ...d, [k]: v });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) return setErr("Enter a task title.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)) return setErr("Choose a due date.");
    setBusy(true); setErr("");
    try {
      if (initial.id) await api.updateTask(initial.id, { ...d, title: d.title.trim() }); else await api.createTask({ ...d, title: d.title.trim() });
      onSaved(initial.id ? "Task updated." : "Task added.");
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  }
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-labelledby="task-dlg-h" className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-black/50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
      <form onSubmit={submit} className="p-6" noValidate>
        <h2 id="task-dlg-h" className="!mb-4 !mt-0 !text-2xl">{initial.id ? "Edit task" : "New task"}</h2>
        <div className="field"><label htmlFor="t-title">Title</label><input id="t-title" value={d.title} onChange={(e) => set("title", e.target.value)} maxLength={120} autoFocus required /></div>
        <div className="field"><label htmlFor="t-desc">Notes (optional)</label><textarea id="t-desc" rows={3} maxLength={2000} value={d.description} onChange={(e) => set("description", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 dark:border-white/15 dark:bg-slate-950/70" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field"><label htmlFor="t-date">Due date</label><input id="t-date" type="date" value={d.dueDate} onChange={(e) => set("dueDate", e.target.value)} required /></div>
          <div className="field"><label htmlFor="t-pr">Priority</label><select id="t-pr" value={d.priority} onChange={(e) => set("priority", Number(e.target.value) as Priority)}>{([1, 2, 3] as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="t-cat">Category</label><select id="t-cat" value={d.category} onChange={(e) => set("category", e.target.value as TaskInput["category"])}>{TASK_CATEGORIES.map((c) => <option key={c} value={c}>{CAT_ICON[c]} {c[0].toUpperCase() + c.slice(1)}</option>)}</select></div>
        {err && <div className="notice error" role="alert">{err}</div>}
        <div className="mt-2 flex justify-end gap-3"><button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save task"}</button></div>
      </form>
    </dialog>
  );
}
