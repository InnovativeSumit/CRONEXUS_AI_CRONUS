import { Router } from "express";
import type { Config } from "../config.js";
import type { Stores } from "../db.js";
import { bus, STATS_CHANGED } from "../services/events.js";
import { computeStats } from "../services/stats.js";

export function statsRouter(cfg: Config, stores: Stores) {
  const r = Router();

  r.get("/", async (_req, res) => res.json(await computeStats(stores, cfg.onlineWindowSeconds)));

  // Server-Sent Events: pushes fresh numbers whenever someone registers/logs in/out.
  r.get("/stream", async (req, res) => {
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    const send = async () => {
      try {
        res.write(`data: ${JSON.stringify(await computeStats(stores, cfg.onlineWindowSeconds))}\n\n`);
      } catch {
        /* db hiccup — next tick will retry */
      }
    };
    let timer: NodeJS.Timeout | null = null;
    const onChange = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void send();
      }, 250);
    };
    bus.on(STATS_CHANGED, onChange);
    const heartbeat = setInterval(() => void send(), 15_000);
    await send();
    req.on("close", () => {
      bus.off(STATS_CHANGED, onChange);
      clearInterval(heartbeat);
      if (timer) clearTimeout(timer);
    });
  });

  return r;
}
