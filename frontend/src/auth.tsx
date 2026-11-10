import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, hasSessionHint, setSessionHint, type SignupData, type User } from "./api";

const COOLDOWN_KEY = "cn_cooldown";
export function getCooldownUntil(): number {
  try { return Number(localStorage.getItem(COOLDOWN_KEY)) || 0; } catch { return 0; }
}
export function setCooldownUntil(ms: number) {
  try { ms ? localStorage.setItem(COOLDOWN_KEY, String(ms)) : localStorage.removeItem(COOLDOWN_KEY); } catch { /* ignore */ }
}

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login(email: string, password: string): Promise<void>;
  signup(d: SignupData): Promise<void>;
  logout(): Promise<void>;
  setUser(u: User): void;
}
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasSessionHint()) { setReady(true); return; }
    api.me().then((r) => setUser(r.user)).catch(() => setSessionHint(false)).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const onUnauth = () => { setSessionHint(false); setUser(null); };
    window.addEventListener("cn-unauthorized", onUnauth);
    return () => window.removeEventListener("cn-unauthorized", onUnauth);
  }, []);

  // Heartbeat: tells the server this session is still active (drives the "online now" counter)
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => { api.me().catch(() => {}); }, 60_000);
    return () => clearInterval(id);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.login({ email, password });
    setSessionHint(true); setCooldownUntil(0); setUser(r.user);
  }, []);
  const signup = useCallback(async (d: SignupData) => {
    const r = await api.signup(d);
    setSessionHint(true); setCooldownUntil(0); setUser(r.user);
  }, []);
  const logout = useCallback(async () => {
    try {
      const r = await api.logout();
      setCooldownUntil(Date.now() + r.cooldownSeconds * 1000);
    } catch { /* token already invalid */ }
    setSessionHint(false); setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, login, signup, logout, setUser }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
