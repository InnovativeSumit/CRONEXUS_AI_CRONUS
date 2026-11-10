import { useSyncExternalStore } from "react";
import { api, API_BASE, type Stats } from "./api";

/**
 * Live community numbers (registered users, users online now) — real values from the backend / MongoDB.
 * The connection is opened ONLY while a component that shows these numbers is mounted
 * (the public landing page and the signed-in Home page) and is closed again when the visitor navigates away,
 * so no other page, form or dashboard ever requests or shows them.
 */
interface Snapshot { stats: Stats | null; live: boolean }
let snap: Snapshot = { stats: null, live: false };
const listeners = new Set<() => void>();
let es: EventSource | null = null;
let poll: number | undefined;

const emit = (next: Partial<Snapshot>) => { snap = { ...snap, ...next }; listeners.forEach((l) => l()); };
function connect() {
  const tick = () => api.stats().then((s) => emit({ stats: s })).catch(() => {});
  const startPolling = () => { if (!poll) { tick(); poll = window.setInterval(tick, 8_000); } };
  if (typeof EventSource !== "undefined") {
    es = new EventSource(`${API_BASE}/api/stats/stream`, { withCredentials: !!API_BASE });
    es.onmessage = (e) => { try { emit({ stats: JSON.parse(e.data), live: true }); } catch { /* ignore malformed frame */ } };
    es.onerror = () => { emit({ live: false }); startPolling(); };
  } else startPolling();
}
function disconnect() {
  es?.close(); es = null;
  if (poll) { clearInterval(poll); poll = undefined; }
  snap = { stats: snap.stats, live: false };
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1) connect();
  return () => { listeners.delete(cb); if (listeners.size === 0) disconnect(); };
}

/** Subscribes to the live stats. Call it only from the landing page / Home page components. */
export function useStats(): Snapshot {
  return useSyncExternalStore(subscribe, () => snap, () => snap);
}
