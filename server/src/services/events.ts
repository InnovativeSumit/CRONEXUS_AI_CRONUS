import { EventEmitter } from "node:events";

/** In-process pub/sub used to push live statistics to SSE clients. */
export const bus = new EventEmitter();
bus.setMaxListeners(0);
export const STATS_CHANGED = "stats-changed";
