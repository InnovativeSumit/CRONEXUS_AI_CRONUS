import nodemailer from "nodemailer";
import type { Config } from "../config.js";

export type DeliveryMode = "smtp" | "console" | "disabled";

export class DeliveryError extends Error {
  constructor(message: string, public status = 503) {
    super(message);
  }
}

/** Sends password-reset / contact e-mail. Swappable in tests. Secrets never leave this module. */
export interface Notifier {
  emailMode: DeliveryMode;
  sendEmail(to: string, subject: string, text: string, html?: string): Promise<void>;
}

export function createNotifier(cfg: Config): Notifier {
  const smtpReady = !!(cfg.smtp.host && cfg.smtp.user && cfg.smtp.pass);
  const emailMode: DeliveryMode = smtpReady ? "smtp" : cfg.allowConsoleDelivery ? "console" : "disabled";

  const transport = smtpReady
    ? nodemailer.createTransport({
        host: cfg.smtp.host,
        port: cfg.smtp.port,
        secure: cfg.smtp.secure,
        auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
        connectionTimeout: 10_000, // fail fast (some hosts block SMTP ports) instead of hanging the request
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      })
    : null;

  return {
    emailMode,
    async sendEmail(to, subject, text, html) {
      if (emailMode === "smtp" && transport) {
        try {
          await transport.sendMail({ from: cfg.smtp.from, to, subject, text, html });
        } catch (e) {
          console.error("[mail] SMTP send failed:", (e as Error).message);
          throw new DeliveryError("We could not send the e-mail right now. Please try again shortly.", 502);
        }
        return;
      }
      if (emailMode === "console") {
        console.log(`\n[DEV MAIL — no SMTP configured] to=${to}\n  subject: ${subject}\n  ${text.replace(/\n/g, "\n  ")}\n`);
        return;
      }
      throw new DeliveryError("E-mail delivery is not configured on this server (set SMTP_* in .env).");
    },
  };
}
