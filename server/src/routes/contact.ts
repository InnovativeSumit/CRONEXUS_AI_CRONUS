import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { Config } from "../config.js";
import type { Stores } from "../db.js";
import type { Notifier } from "../services/notify.js";
import { zodMessage } from "../validators.js";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().max(254).email("Enter a valid email address.").transform((v) => v.toLowerCase()),
  subject: z.string().trim().min(3, "Enter a subject.").max(120),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(3000, "Message is too long."),
  website: z.string().max(200).optional().default(""), // honeypot: real users never see or fill this
});

export function contactRouter(cfg: Config, stores: Stores, notifier: Notifier) {
  const r = Router();
  const limiter = rateLimit({ windowMs: 60 * 60_000, limit: cfg.contactRateLimit, standardHeaders: true, legacyHeaders: false, message: { error: "Too many messages from this connection. Please try again later." } });

  /** Only details the site owner chose to publish in .env are returned — nothing is invented. */
  r.get("/info", (_req, res) => {
    const c = cfg.contact;
    res.json({ developerName: c.developerName || null, developerPhone: c.developerPhone || null, email: c.developerEmail || null, formEnabled: true, emailForwarding: !!c.toEmail });
  });

  r.post("/", limiter, async (req, res) => {
    const p = schema.safeParse(req.body);
    if (!p.success) return res.status(400).json(zodMessage(p.error));
    if (p.data.website) return res.json({ ok: true, message: "Thank you! Your message has been received." }); // bots get a silent success
    const { name, email, subject, message } = p.data;
    let emailed = false;
    if (cfg.contact.toEmail) {
      try {
        await notifier.sendEmail(cfg.contact.toEmail, `[CropNexus contact] ${subject}`.slice(0, 150), `From: ${name} <${email}>\n\n${message}`);
        emailed = true;
      } catch { /* the message is still stored below */ }
    }
    await stores.contacts.insertOne({ name, email, subject, message, createdAt: new Date(), emailed });
    res.status(201).json({ ok: true, message: "Thank you! Your message has been received." });
  });
  return r;
}
