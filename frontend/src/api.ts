export interface User {
  id: string; name: string; email: string; phone: string; country: string | null; age: number | null; ageGroup: AgeGroup | null; avatar: string | null; createdAt: string;
}
export type Rating = 1 | 2 | 3 | 4 | 5;
export type AgeGroup = "0-17" | "18-24" | "25-30" | "30+";
export interface FeedbackItem { id: string; name: string; text: string; rating: Rating; createdAt: string; avatar: string | null }
export interface MyFeedback { id: string; name: string; text: string; rating: Rating; status: "published" | "pending" | "rejected"; createdAt: string }
export interface Stats {
  ageGroups: { group: AgeGroup; count: number }[]; ageTotal: number;
  totalUsers: number; registrationsToday: number; totalLogins: number; loginsToday: number; onlineNow: number;
  last7Days: { date: string; registrations: number; logins: number }[]; updatedAt: string;
}
export interface FeedbackList { items: FeedbackItem[]; count: number; average: number | null; distribution: Record<Rating, number> }
export interface CropRank { crop: string; confidence: number }
export interface CropInfo {
  season?: string; fertilizer_guidance?: string; irrigation_guidance?: string; common_diseases?: string[];
  ideal_conditions?: Record<string, number>;
  data_source?: "real" | "synthetic";
}
export interface AdvisoryResult {
  top_crops: CropRank[]; recommended_crop: string; info: CropInfo; tips: string[]; inputs: Record<string, number>;
  location?: string; soil_type?: string;
  data_source?: "real" | "synthetic"; data_note?: string | null;
}
export interface LeafResult {
  top_predictions: { class: string; confidence: number }[];
  info: { crop?: string; disease_name?: string; is_healthy?: boolean; symptoms?: string; treatment?: string };
}
export interface HistoryRow {
  id: string; type: "crop" | "leaf" | "soil"; timestamp: string; location?: string; soil_type?: string;
  recommended_crop?: string; top_crops?: CropRank[]; disease_name?: string; top_predictions?: { class: string; confidence: number }[];
}
export interface ModelInfo {
  crop_model: { final_model_name?: string; test_accuracy?: number; n_classes?: number; classes?: string[]; accuracy_by_source?: Record<"real" | "synthetic", { test_rows: number; accuracy: number }>; data_sources?: Record<"real" | "synthetic", { rows: number; crops: string[]; origin: string }>; evaluation_note?: string };
  leaf_model: { model_name?: string; test_accuracy?: number; n_classes?: number; classes?: string[] } | null;
}

export class ApiError extends Error {
  constructor(message: string, public status = 0, public code?: string, public fields: Record<string, string> = {}, public retryAfterSeconds?: number) {
    super(message);
  }
}

// The session lives in an HttpOnly cookie that JavaScript cannot read. We only keep a harmless
// "was signed in" hint so guests don't trigger a pointless /auth/me request (and a 401 in the console).
const HINT_KEY = "cn_session_hint";
export const hasSessionHint = () => { try { return localStorage.getItem(HINT_KEY) === "1"; } catch { return false; } };
export const setSessionHint = (on: boolean) => { try { on ? localStorage.setItem(HINT_KEY, "1") : localStorage.removeItem(HINT_KEY); } catch { /* ignore */ } };

// Same-origin by default (dev proxy / Vercel rewrite / Express serving the build).
// Set VITE_API_URL at BUILD time (e.g. https://cropnexus-api.onrender.com) to call the API on another origin;
// the API must then allow this site in CLIENT_ORIGIN and use COOKIE_SAMESITE=none (see DEPLOYMENT.md).
export const API_BASE: string = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").trim().replace(/\/+$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Requested-With", "cropnexus"); // CSRF guard expected by the API for writes
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, { ...init, headers, credentials: API_BASE ? "include" : "same-origin" });
  } catch {
    throw new ApiError("NETWORK", 0, "NETWORK");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && body.code === "UNAUTHENTICATED") window.dispatchEvent(new Event("cn-unauthorized"));
    throw new ApiError(body.error || `Request failed (${res.status})`, res.status, body.code, body.fields, body.retryAfterSeconds);
  }
  return body as T;
}
export const qs = (q: Record<string, unknown>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && String(v).trim() !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};
const post = <T,>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) });

export interface AuthConfig { emailDelivery: "smtp" | "console" | "disabled"; loginCooldownSeconds: number }
export interface SignupData { name: string; age: number; email: string; country: string; phone: string; password: string; confirmPassword: string }

// ---------- v7 feature types ----------

export interface Place { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string }
export interface DailyWeather { date: string; code: number; tmax: number | null; tmin: number | null; rain: number | null; rainProb: number | null; et0: number | null; windMax: number | null; label: string; icon: string }
export interface Insight { id: string; level: "ok" | "watch" | "warning"; title: string; detail: string; basis: string }
export interface WeatherResp {
  forecast: {
    latitude: number; longitude: number; timezone: string; fetchedAt: string; attribution: string;
    current: { time: string; temperature: number | null; feelsLike: number | null; humidity: number | null; precipitation: number | null; windSpeed: number | null; windDirection: number | null; code: number | null; label: string; icon: string };
    daily: DailyWeather[]; units: { temperature: string; wind: string; precipitation: string; et0: string };
  };
  insights: Insight[]; cached: boolean; stale: boolean; note: string;
}

export type Priority = 1 | 2 | 3;
export type TaskStatus = "all" | "open" | "done" | "overdue" | "upcoming";
export const TASK_CATEGORIES = ["sowing", "irrigation", "fertilization", "pesticide", "harvesting", "maintenance", "other"] as const;
export interface Task { id: string; title: string; description: string; dueDate: string; priority: Priority; category: (typeof TASK_CATEGORIES)[number]; completed: boolean; completedAt: string | null; overdue: boolean; createdAt: string }
export interface TaskList { items: Task[]; summary: { total: number; open: number; done: number; overdue: number; dueToday: number }; today: string }
export type TaskInput = { title: string; description?: string; dueDate: string; priority: Priority; category: Task["category"] };

export interface Product { id: string; name: string; category: string; description: string; imageUrl: string | null; manufacturer: string | null; seller: string | null; price: number | null; currency: string | null; purchaseUrl: string; sourceUrl: string | null; verifiedAt: string | null; imageVerified: boolean }
export interface ProductList { items: Product[]; total: number; categories: { name: string; count: number }[] }

export interface WaterOptions { crops: { id: string; name: string; cycleDays: number }[]; soils: { id: string; name: string }[]; methods: string[] }
export interface PlanDay { date: string; et0: number; kc: number; etc: number; rain: number; effectiveRain: number; depletionMm: number; irrigate: boolean; irrigateMm: number }
export interface WaterPlan {
  plan: { crop: string; soil: string; stage: string; dayOfCycle: number; takMm: number; rawMm: number; startDepletionMm: number; efficiency: number; days: PlanDay[]; nextIrrigation: { date: string; netMm: number; grossMm: number } | null; weekNetMm: number; weekGrossMm: number; assumptions: string[]; tips: string[] };
  stale: boolean; fetchedAt: string; attribution: string; disclaimer: string; references: { title: string; url: string }[];
}
export interface WaterInput { crop: string; soil: string; lat: number; lon: number; plantingDate?: string; stageDay?: number; moisturePct?: number; method: string; today?: string }

export interface Scheme { id: string; name: string; level: "central" | "state"; state: string; type: string; description: string | null; eligibility: string | null; benefits: string | null; howToApply: string | null; officialUrl: string; sourceName: string | null; status: "active" | "unconfirmed" | "closed"; lastVerified: string | null; imageUrl: string | null }
export interface NewsItem { title: string; link: string; summary: string; published: string | null; source: string }
export interface NewsResp { items: NewsItem[]; sources: { name: string; siteUrl: string | null; note: string | null }[]; failed: string[]; fetchedAt: string | null; note?: string }

export interface ContactInfo { developerName: string | null; developerPhone: string | null; email: string | null; formEnabled: boolean; emailForwarding: boolean }
export interface SoilMetrics { model_name?: string; test_accuracy?: number; macro_f1?: number; test_images?: number; train_images?: number; n_classes?: number; classes?: string[]; dataset_note?: string; limitations?: string }
export interface SoilStatus { image_model_available: boolean; metrics: SoilMetrics | null; how_to_train?: string; error?: string }
export interface SoilRating { parameter: string; label: string; value: number; unit?: string; rating: string; advice: string }
export interface SoilAnalysis {
  image: null | { top_predictions: { class: string; label: string; confidence: number }[]; info: { label: string; about: string; suits: string; improve: string }; low_confidence: boolean; model: SoilMetrics };
  measurements: null | { ratings: SoilRating[]; method: string };
  imageError?: string;
}

export const api = {
  authConfig: () => request<AuthConfig>("/auth/config"),
  signup: (d: SignupData) => post<{ user: User }>("/auth/signup", d),
  login: (d: { email: string; password: string }) => post<{ user: User }>("/auth/login", d),
  logout: () => post<{ ok: boolean; cooldownSeconds: number }>("/auth/logout"),
  me: () => request<{ user: User }>("/auth/me"),
  forgot: (email: string) => post<{ ok: boolean; message: string }>("/auth/forgot-password", { email }),
  reset: (d: { token: string; password: string; confirmPassword: string }) => post<{ ok: boolean; message: string }>("/auth/reset-password", d),
  stats: () => request<Stats>("/stats"),
  updateProfile: (d: { name?: string; avatar?: string | null }) => request<{ user: User }>("/profile", { method: "PATCH", body: JSON.stringify(d) }),
  feedbackList: () => request<FeedbackList>("/feedback"),
  myFeedback: () => request<{ items: MyFeedback[]; remaining: number; max: number }>("/feedback/mine"),
  deleteFeedback: (id: string) => request<{ ok: boolean }>(`/feedback/${id}`, { method: "DELETE" }),
  modelSummary: () => request<{ cropAccuracy: number | null; cropCount: number | null; leafClasses: number | null; leafAccuracy: number | null; soilAccuracy?: number | null; soilClasses?: number | null }>("/model-summary"),
  sendFeedback: (d: { name: string; text: string; rating: Rating }) => post<{ ok: boolean; status: string; remaining: number }>("/feedback", d),
  advisory: (d: Record<string, unknown>) => post<AdvisoryResult>("/advisory", d),
  leaf: (file: File) => { const f = new FormData(); f.append("leaf_image", file); return request<LeafResult>("/leaf-disease", { method: "POST", body: f }); },
  history: () => request<HistoryRow[]>("/history"),
  deleteHistory: (id: string) => request<{ ok: boolean }>(`/history/${id}`, { method: "DELETE" }),
  modelInfo: () => request<ModelInfo>("/model-info"),

  weatherSearch: (q: string) => request<{ places: Place[]; attribution: string }>(`/weather/search${qs({ q })}`),
  weather: (lat: number, lon: number) => request<WeatherResp>(`/weather${qs({ lat, lon })}`),
  tasks: (q: { status?: TaskStatus; priority?: number; from?: string; to?: string; today?: string } = {}) => request<TaskList>(`/calendar${qs(q)}`),
  createTask: (d: TaskInput) => post<{ task: Task }>("/calendar", d),
  updateTask: (id: string, d: Partial<TaskInput> & { completed?: boolean }) => request<{ task: Task }>(`/calendar/${id}`, { method: "PATCH", body: JSON.stringify(d) }),
  deleteTask: (id: string) => request<{ ok: boolean }>(`/calendar/${id}`, { method: "DELETE" }),
  products: (q: { q?: string; category?: string } = {}) => request<ProductList>(`/products${qs(q)}`),
  product: (id: string) => request<{ product: Product }>(`/products/${encodeURIComponent(id)}`),
  waterOptions: () => request<WaterOptions>("/water/options"),
  waterPlan: (d: WaterInput) => post<WaterPlan>("/water/plan", d),
  schemes: (q: { q?: string; level?: string; type?: string } = {}) => request<{ items: Scheme[]; total: number; types: string[]; note: string }>(`/resources/schemes${qs(q)}`),
  news: (q?: string) => request<NewsResp>(`/resources/news${qs({ q })}`),
  contactInfo: () => request<ContactInfo>("/contact/info"),
  sendContact: (d: { name: string; email: string; subject: string; message: string; website?: string }) => post<{ ok: boolean; message: string }>("/contact", d),
  soilStatus: () => request<SoilStatus>("/soil/status"),
  soilAnalyze: (file: File | null, values: Record<string, string>) => {
    const f = new FormData();
    if (file) f.append("soil_image", file);
    for (const [k, v] of Object.entries(values)) if (v.trim() !== "") f.append(k, v.trim());
    return request<SoilAnalysis>("/soil/analyze", { method: "POST", body: f });
  },
};
