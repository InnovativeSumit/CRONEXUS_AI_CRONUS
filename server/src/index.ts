import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { connectMongo } from "./db.js";
import { createNotifier } from "./services/notify.js";

let cfg;
try {
  cfg = loadConfig();
} catch (e: any) {
  console.error(`\n✖ ${e?.message ?? e}\n`);
  process.exit(1);
}

// Never print the full connection string: it contains the database password.
const safeMongo = cfg.mongoUri.replace(/\/\/([^@/]+)@/, "//***@");

try {
  const db = await connectMongo(cfg);
  const notifier = createNotifier(cfg);
  const app = createApp(cfg, db, undefined, notifier);
  const server = app.listen(cfg.port, "0.0.0.0", () => {
    console.log(`CropNexus API  → listening on port ${cfg.port} (${cfg.isProd ? "production" : "development"})`);
    console.log(`MongoDB        → ${safeMongo} (collection ${cfg.usersCollection})`);
    console.log(`E-mail (reset) → ${notifier.emailMode === "console" ? "printed in THIS terminal (set SMTP_* in .env to send real e-mail)" : notifier.emailMode}`);
    console.log(`AI service     → ${cfg.mlServiceUrl}${cfg.mlServiceKey ? " (service key set)" : cfg.isProd ? "  ⚠ ML_SERVICE_KEY is empty - anyone who finds the AI service URL can call it" : ""}`);
    console.log(`Cookies        → SameSite=${cfg.cookieSameSite}, Secure=${cfg.isProd || cfg.cookieSameSite === "none"}`);
  });
  // Platforms keep idle connections alive longer than Node's defaults; avoid sporadic 502s from the proxy.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    console.log(`${signal} received, shutting down…`);
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(async () => {
      await db.close().catch(() => {});
      process.exit(0);
    });
    server.closeAllConnections?.(); // ends open SSE streams so close() can finish
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => console.error("Unhandled promise rejection:", reason));
} catch (e: any) {
  console.error(`\n✖ Could not start the API.\n  ${e?.message ?? e}\n  Check MONGO_URI (and, on Atlas, that Network Access allows your host) and try again.\n`);
  process.exit(1);
}
