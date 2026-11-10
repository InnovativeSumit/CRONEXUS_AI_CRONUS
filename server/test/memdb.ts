/**
 * Tiny in-memory stand-in for the MongoDB driver's Collection API (only what
 * CropNexus uses). Lets the API tests run on machines without a mongod binary.
 * Production code always uses the real `mongodb` driver (src/db.ts).
 */
import { ObjectId } from "mongodb";
import type { Stores } from "../src/db.js";

type Doc = Record<string, any>;

const cmp = (a: any, b: any) => {
  const x = a instanceof Date ? a.getTime() : a, y = b instanceof Date ? b.getTime() : b;
  return typeof x === "string" && typeof y === "string" ? (x < y ? -1 : x > y ? 1 : 0) : x - y;
};
function matches(doc: Doc, q: Doc): boolean {
  return Object.entries(q).every(([k, cond]) => {
    const v = doc[k];
    if (cond && typeof cond === "object" && !(cond instanceof Date) && !(cond instanceof ObjectId)) {
      return Object.entries(cond).every(([op, x]: [string, any]) => {
        if (op === "$gte") return v != null && cmp(v, x) >= 0;
        if (op === "$gt") return v != null && cmp(v, x) > 0;
        if (op === "$lt") return v != null && cmp(v, x) < 0;
        throw new Error("unsupported op " + op);
      });
    }
    if (cond instanceof ObjectId) return v instanceof ObjectId && v.equals(cond);
    return v === cond;
  });
}

class MemCollection {
  docs: Doc[] = [];
  uniques: string[] = [];
  async createIndex(spec: Doc, opts?: Doc) {
    if (opts?.unique) this.uniques.push(...Object.keys(spec));
    return "idx";
  }
  async findOne(q: Doc) { return this.docs.find((d) => matches(d, q)) ?? null; }
  async insertOne(doc: Doc) {
    for (const u of this.uniques) if (this.docs.some((d) => d[u] === doc[u])) throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
    const _id = new ObjectId();
    this.docs.push({ ...doc, _id });
    return { insertedId: _id };
  }
  async insertMany(docs: Doc[]) { for (const d of docs) await this.insertOne(d); return {}; }
  async updateOne(q: Doc, upd: Doc) {
    const d = this.docs.find((x) => matches(x, q));
    if (!d) return { matchedCount: 0 };
    Object.assign(d, upd.$set ?? {});
    for (const [k, n] of Object.entries(upd.$inc ?? {})) d[k] = (d[k] ?? 0) + (n as number);
    return { matchedCount: 1 };
  }
  async bulkWrite(ops: Doc[]) {
    for (const op of ops) {
      const u = op.updateOne;
      const d = this.docs.find((x) => matches(x, u.filter));
      if (d) Object.assign(d, u.update.$set ?? {});
      else if (u.upsert) this.docs.push({ ...(u.update.$set ?? {}), _id: new ObjectId() });
    }
    return {};
  }
  async deleteOne(q: Doc) { const i = this.docs.findIndex((x) => matches(x, q)); if (i >= 0) this.docs.splice(i, 1); return {}; }
  async countDocuments(q: Doc) { return this.docs.filter((d) => matches(d, q)).length; }
  find(q: Doc) {
    let rows = this.docs.filter((d) => matches(d, q));
    const cur = {
      sort: (s: Doc) => { const [[k, dir]] = Object.entries(s); rows = [...rows].sort((a, b) => cmp(a[k], b[k]) * (dir as number)); return cur; },
      limit: (n: number) => { rows = rows.slice(0, n); return cur; },
      toArray: async () => rows,
    };
    return cur;
  }
}

export function memoryStores(): Stores {
  const s = { users: new MemCollection(), events: new MemCollection(), history: new MemCollection(), feedback: new MemCollection(), tasks: new MemCollection(), contacts: new MemCollection() };
  s.users.createIndex({ email: 1 }, { unique: true });
  return s as unknown as Stores;
}
