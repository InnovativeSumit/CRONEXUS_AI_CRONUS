// Dev/test helper: runs the real Express app on an in-memory store (no MongoDB needed).
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { memoryStores } from "./memdb.js";
const cfg = loadConfig({ port: Number(process.env.PORT) || 5050, bcryptRounds: 8 });
createApp(cfg, { stores: memoryStores(), ping: async () => true }).listen(cfg.port, () => console.log("e2e server on", cfg.port));
