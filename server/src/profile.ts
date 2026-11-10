import type { AgeGroup, UserDoc } from "./types.js";

export const AVATAR_PRESETS = ["m1", "m2", "m3", "f1", "f2", "f3"] as const;
export const AGE_GROUPS: AgeGroup[] = ["0-17", "18-24", "25-30", "30+"];

export function ageGroupOf(age: number): AgeGroup {
  if (age <= 17) return "0-17";
  if (age <= 24) return "18-24";
  if (age <= 30) return "25-30";
  return "30+";
}

const PHOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export const MAX_PHOTO_CHARS = 120_000; // ≈ 90 KB; the browser downsizes photos to ~160px before upload

/** Returns the cleaned avatar value, or undefined when it is not acceptable. */
export function cleanAvatar(v: unknown): string | null | undefined {
  if (v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  if (v.startsWith("preset:")) return (AVATAR_PRESETS as readonly string[]).includes(v.slice(7)) ? v : undefined;
  return v.length <= MAX_PHOTO_CHARS && PHOTO.test(v) ? v : undefined;
}

export function publicUser(u: UserDoc) {
  return {
    id: String(u._id), name: u.name, email: u.email, phone: u.phone, country: u.country ?? null,
    emailVerified: !!u.emailVerified, phoneVerified: !!u.phoneVerified,
    age: u.age ?? null, ageGroup: u.ageGroup ?? null, avatar: u.avatar ?? null, createdAt: u.createdAt,
  };
}
