import type { Stores } from "../db.js";
import { AGE_GROUPS } from "../profile.js";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export interface Stats {
  ageGroups: { group: string; count: number }[];
  ageTotal: number;
  totalUsers: number;
  registrationsToday: number;
  totalLogins: number;
  loginsToday: number;
  onlineNow: number;
  last7Days: { date: string; registrations: number; logins: number }[];
  updatedAt: string;
}

export async function computeStats(s: Stores, onlineWindowSeconds = 300): Promise<Stats> {
  const now = new Date();
  const today = startOfDay(now);
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) days.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));

  const [totalUsers, registrationsToday, totalLogins, loginsToday, onlineNow] = await Promise.all([
    s.users.countDocuments({}),
    s.users.countDocuments({ createdAt: { $gte: today } }),
    s.events.countDocuments({ type: "login" }),
    s.events.countDocuments({ type: "login", at: { $gte: today } }),
    s.users.countDocuments({ isOnline: true, lastSeenAt: { $gte: new Date(Date.now() - onlineWindowSeconds * 1000) } }),
  ]);

  const last7Days = await Promise.all(
    days.map(async (d, i) => {
      const next = i === days.length - 1 ? new Date(today.getTime() + 86_400_000) : days[i + 1];
      const range = { $gte: d, $lt: next };
      const [registrations, logins] = await Promise.all([
        s.users.countDocuments({ createdAt: range }),
        s.events.countDocuments({ type: "login", at: range }),
      ]);
      return { date: d.toISOString().slice(0, 10), registrations, logins };
    })
  );

  const ageGroups = await Promise.all(AGE_GROUPS.map(async (group) => ({ group, count: await s.users.countDocuments({ ageGroup: group }) })));
  const ageTotal = ageGroups.reduce((n, g) => n + g.count, 0);

  return { ageGroups, ageTotal, totalUsers, registrationsToday, totalLogins, loginsToday, onlineNow, last7Days, updatedAt: now.toISOString() };
}
