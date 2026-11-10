import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import type { Config } from "../config.js";
import type { Stores } from "../db.js";
import type { UserDoc } from "../types.js";

declare global {
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export function signToken(cfg: Config, user: UserDoc): string {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion }, cfg.jwtSecret, {
    expiresIn: cfg.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

/** SameSite=None (cross-site hosting) is only accepted by browsers together with Secure. */
const cookieBase = (cfg: Config) => ({ httpOnly: true, sameSite: cfg.cookieSameSite, secure: cfg.isProd || cfg.cookieSameSite === "none", path: "/" });

/** Session = signed JWT in an HttpOnly cookie: JavaScript (and so browser dev-tools "Application → Storage" scripts / XSS) cannot read it. */
export function setSessionCookie(cfg: Config, res: Response, user: UserDoc) {
  res.cookie(cfg.cookieName, signToken(cfg, user), {
    ...cookieBase(cfg),
    maxAge: parseDuration(cfg.jwtExpiresIn),
  });
}
export const clearSessionCookie = (cfg: Config, res: Response) => res.clearCookie(cfg.cookieName, cookieBase(cfg));

function parseDuration(v: string): number {
  const m = /^(\d+)\s*([smhd]?)$/.exec(v.trim());
  if (!m) return 7 * 86400_000;
  return Number(m[1]) * ({ "": 1000, s: 1000, m: 60_000, h: 3600_000, d: 86400_000 } as Record<string, number>)[m[2]];
}

function readCookie(req: Request, name: string): string {
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}

/** Custom header a cross-site form/image cannot send → CSRF defence on top of SameSite=Strict. */
export const CSRF_HEADER = "x-requested-with";
export const CSRF_VALUE = "cropnexus";

export function requireAuth(cfg: Config, stores: Stores) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = readCookie(req, cfg.cookieName);
    if (!token) return res.status(401).json({ error: "Please log in to continue.", code: "UNAUTHENTICATED" });
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers[CSRF_HEADER] !== CSRF_VALUE) {
      return res.status(403).json({ error: "Blocked by CSRF protection.", code: "CSRF" });
    }
    try {
      const payload = jwt.verify(token, cfg.jwtSecret) as jwt.JwtPayload;
      const user = await stores.users.findOne({ _id: new ObjectId(String(payload.sub)) });
      // tokenVersion changes on logout / password reset => old sessions stop working immediately
      if (!user || user.tokenVersion !== payload.tv) throw new Error("revoked");
      req.user = user;
      // heartbeat: keeps the "online now" counter honest (throttled to one write a minute)
      if (!user.lastSeenAt || Date.now() - new Date(user.lastSeenAt).getTime() > 60_000) {
        await stores.users.updateOne({ _id: user._id }, { $set: { lastSeenAt: new Date() } });
      }
      next();
    } catch {
      res.status(401).json({ error: "Your session has expired. Please log in again.", code: "UNAUTHENTICATED" });
    }
  };
}

export { publicUser } from "../profile.js";
