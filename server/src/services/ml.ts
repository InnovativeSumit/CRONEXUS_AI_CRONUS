import type { Config } from "../config.js";

export class MlError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

/** Thin client for the Python FastAPI service. */
export class MlClient {
  constructor(private cfg: Config) {}

  private headers(extra: Record<string, string> = {}) {
    return this.cfg.mlServiceKey ? { ...extra, "x-service-key": this.cfg.mlServiceKey } : extra;
  }

  private async call<T>(path: string, init: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.cfg.mlServiceUrl}${path}`, { ...init, signal: AbortSignal.timeout(60_000) });
    } catch {
      throw new MlError("The AI service is not reachable right now. If it was idle it may be waking up; please try again in a minute.", 503);
    }
    if (!res.ok) {
      let detail = `AI service error (${res.status})`;
      try {
        const body: any = await res.json();
        if (typeof body?.detail === "string") detail = body.detail;
        else if (Array.isArray(body?.detail)) detail = body.detail.map((d: any) => d.msg).join("; ");
      } catch {
        /* keep generic */
      }
      throw new MlError(detail, res.status >= 400 && res.status < 500 ? res.status : 502);
    }
    return (await res.json()) as T;
  }

  health() {
    return this.call<any>("/health", { headers: this.headers() }).catch(() => null);
  }

  crop(input: Record<string, unknown>) {
    return this.call<any>("/predict/crop", {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify(input),
    });
  }

  leaf(file: { buffer: Buffer; mimetype: string; originalname: string }) {
    const form = new FormData();
    form.append("leaf_image", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    return this.call<any>("/predict/leaf", { method: "POST", headers: this.headers(), body: form });
  }

  soilAssess(values: Record<string, unknown>) {
    return this.call<any>("/soil/assess", { method: "POST", headers: this.headers({ "content-type": "application/json" }), body: JSON.stringify(values) });
  }

  soilStatus() {
    return this.call<any>("/soil/status", { headers: this.headers() });
  }

  soilPhoto(file: { buffer: Buffer; mimetype: string; originalname: string }) {
    const form = new FormData();
    form.append("soil_image", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    return this.call<any>("/predict/soil", { method: "POST", headers: this.headers(), body: form });
  }

  modelInfo() {
    return this.call<any>("/model-info", { headers: this.headers() });
  }
}
