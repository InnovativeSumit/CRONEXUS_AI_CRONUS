import { z } from "zod";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

export const normalizeEmail = (v: string) => v.trim().toLowerCase();
export const normalizePhone = (v: string) => v.replace(/[\s\-().]/g, "");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[A-Za-z]/, "Password must contain a letter.")
  .regex(/\d/, "Password must contain a number.");

const email = z.string().trim().max(254).email("Enter a valid email address.").transform(normalizeEmail);
const age = z.coerce
  .number({ error: "Enter your age." })
  .int("Age must be a whole number.")
  .min(0, "Enter a valid age.")
  .max(120, "Enter a valid age.");

/** Parses a phone number (international "+.." or national + country) into E.164; null when invalid. */
export function parsePhone(input: string, country?: string): { e164: string; country: string } | null {
  const p = parsePhoneNumberFromString(normalizePhone(input), (country?.toUpperCase() as CountryCode) || undefined);
  if (!p || !p.isValid() || !p.country) return null;
  return { e164: p.number, country: p.country };
}

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
    age,
    email,
    country: z.string().length(2, "Choose your country."),
    phone: z.string().min(5, "Enter your mobile number.").max(30),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] })
  .refine((d) => parsePhone(d.phone, d.country) !== null, { message: "Enter a valid mobile number for the selected country.", path: ["phone"] });

export const loginSchema = z.object({ email, password: z.string().min(1, "Password is required.") });
export const forgotSchema = z.object({ email });
export const resetSchema = z
  .object({ token: z.string().min(10), password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

const n = (min: number, max: number, label: string) =>
  z.coerce.number({ error: `${label} must be a number.` }).min(min, `${label} must be ≥ ${min}.`).max(max, `${label} must be ≤ ${max}.`);

export const advisorySchema = z.object({
  nitrogen: n(0, 300, "Nitrogen"),
  phosphorus: n(0, 300, "Phosphorus"),
  potassium: n(0, 300, "Potassium"),
  temperature: n(-10, 60, "Temperature"),
  humidity: n(0, 100, "Humidity"),
  ph: n(0, 14, "pH"),
  rainfall: n(0, 5000, "Rainfall"),
  location: z.string().trim().max(120).optional().default(""),
  soil_type: z.string().trim().max(60).optional().default(""),
});

/** First human-readable message from a zod error, plus per-field map. */
export function zodMessage(err: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    if (!fields[k]) fields[k] = i.message;
  }
  return { error: err.issues[0]?.message ?? "Invalid input.", fields };
}

export const countWords = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export const feedbackSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(60),
  text: z
    .string()
    .trim()
    .min(1, "Please write your feedback.")
    .max(400, "Feedback is too long.")
    .refine((t) => countWords(t) <= 30, "Feedback can be at most 30 words."),
  rating: z.coerce.number().int().min(1, "Choose a rating from 1 to 5 stars.").max(5, "Choose a rating from 1 to 5 stars.").transform((r) => r as 1 | 2 | 3 | 4 | 5),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80).optional(),
  avatar: z.union([z.string(), z.null()]).optional(),
});
