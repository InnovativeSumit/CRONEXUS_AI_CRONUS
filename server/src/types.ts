import type { ObjectId } from "mongodb";

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  /** ISO 3166-1 alpha-2 country of the phone number, e.g. "IN" */
  country?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  failedLogins?: number;
  lockUntil?: Date | null;
  resetRequestedAt?: Date | null;
  age?: number;
  ageGroup?: AgeGroup;
  /** "preset:<id>" or a small data:image/... URL (profile photo) */
  avatar?: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  lastLogoutAt?: Date | null;
  /** refreshed by the app heartbeat; "online" = seen in the last 5 minutes */
  lastSeenAt?: Date | null;
  isOnline: boolean;
  loginCount: number;
  tokenVersion: number;
  resetTokenHash?: string | null;
  resetTokenExpires?: Date | null;
  /** legacy field written by the earlier Flask version of CropNexus */
  password?: string;
}

export type AgeGroup = "0-17" | "18-24" | "25-30" | "30+";

export interface FeedbackDoc {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
  status: "published" | "pending" | "rejected";
  createdAt: Date;
}

export interface AuthEventDoc {
  _id?: ObjectId;
  userId: ObjectId;
  type: "signup" | "login" | "logout";
  at: Date;
}

export interface HistoryDoc {
  _id?: ObjectId;
  userId: ObjectId;
  type: "crop" | "leaf" | "soil";
  createdAt: Date;
  location?: string;
  soil_type?: string;
  inputs?: Record<string, number>;
  top_crops?: { crop: string; confidence: number }[];
  recommended_crop?: string;
  top_predictions?: { class: string; confidence: number }[];
  disease_name?: string;
}


export type TaskCategory = "sowing" | "irrigation" | "fertilization" | "pesticide" | "harvesting" | "maintenance" | "other";
export interface TaskDoc {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  description: string;
  /** YYYY-MM-DD (local calendar date chosen by the user) */
  dueDate: string;
  priority: 1 | 2 | 3;
  category: TaskCategory;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactDoc {
  _id?: ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  emailed: boolean;
}
