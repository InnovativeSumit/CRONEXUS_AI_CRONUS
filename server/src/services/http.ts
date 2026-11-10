/** Outbound HTTP used by every external integration. Injectable so tests never touch the network. */
export interface Http {
  getJson<T = unknown>(url: string, opts?: { timeoutMs?: number; headers?: Record<string, string> }): Promise<T>;
  getText(url: string, opts?: { timeoutMs?: number; headers?: Record<string, string> }): Promise<string>;
}

export class UpstreamError extends Error {
  constructor(message: string, public status = 502, public code = "UPSTREAM_FAILED") {
    super(message);
  }
}

const UA = "Mozilla/5.0 (compatible; CropNexus/1.0; +https://localhost)";

async function doFetch(url: string, opts: { timeoutMs?: number; headers?: Record<string, string> } = {}, retries = 1): Promise<Response> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json, text/xml, */*", ...opts.headers }, signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000) });
      if (res.status === 429 || res.status >= 500) {
        last = new UpstreamError(`Upstream responded HTTP ${res.status}`, 502, res.status === 429 ? "UPSTREAM_RATE_LIMITED" : "UPSTREAM_FAILED");
        if (attempt < retries) { await new Promise((r) => setTimeout(r, 600 * (attempt + 1))); continue; }
        throw last;
      }
      if (!res.ok) throw new UpstreamError(`Upstream responded HTTP ${res.status}`, res.status === 401 || res.status === 403 ? 502 : 502, res.status === 401 || res.status === 403 ? "UPSTREAM_AUTH" : "UPSTREAM_FAILED");
      return res;
    } catch (e) {
      if (e instanceof UpstreamError) throw e;
      last = e;
      if (attempt < retries) { await new Promise((r) => setTimeout(r, 600 * (attempt + 1))); continue; }
    }
  }
  const timedOut = (last as Error)?.name === "TimeoutError";
  throw new UpstreamError(timedOut ? "The data provider took too long to respond." : "Could not reach the data provider.", 504, timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNREACHABLE");
}

export const defaultHttp: Http = {
  async getJson(url, opts) {
    const res = await doFetch(url, opts);
    try { return (await res.json()) as never; } catch { throw new UpstreamError("The data provider returned an unreadable response."); }
  },
  async getText(url, opts) {
    return (await doFetch(url, opts)).text();
  },
};

/** Tiny TTL cache (per process). */
export class TtlCache<T> {
  private m = new Map<string, { at: number; v: T }>();
  constructor(private ttlMs: number, private max = 200) {}
  get(k: string): { value: T; ageMs: number } | null {
    const e = this.m.get(k);
    return e && Date.now() - e.at < this.ttlMs ? { value: e.v, ageMs: Date.now() - e.at } : null;
  }
  /** Returns even expired entries (used as a stale fallback when the provider is down). */
  stale(k: string): { value: T; ageMs: number } | null {
    const e = this.m.get(k);
    return e ? { value: e.v, ageMs: Date.now() - e.at } : null;
  }
  set(k: string, v: T) {
    if (this.m.size >= this.max) this.m.delete(this.m.keys().next().value as string);
    this.m.set(k, { at: Date.now(), v });
  }
}
