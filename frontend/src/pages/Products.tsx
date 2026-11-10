import { useEffect, useRef, useState } from "react";
import { api, type Product } from "../api";
import { Attribution, Empty, ErrorBox, Loading, PageHeader, Tag, fmtDate, useAsync, useDebounced } from "../components/ui";

const money = (p: Product) => (p.price === null || !p.currency ? null : new Intl.NumberFormat(p.currency === "INR" ? "en-IN" : undefined, { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(p.price));
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

/** Placeholder used when a product has no (or a broken) image. */
function Img({ p, className }: { p: Product; className?: string }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [p.imageUrl]);
  if (!p.imageUrl || bad) return <div className={`grid place-items-center bg-gradient-to-br from-brand-100 to-amber-100 text-5xl dark:from-brand-900 dark:to-slate-800 ${className ?? ""}`} role="img" aria-label={`${p.name} (no photo available)`}>🌿</div>;
  return <img src={p.imageUrl} alt={p.name} loading="lazy" referrerPolicy="no-referrer" className={`bg-white object-contain ${className ?? ""}`} onError={() => setBad(true)} />;
}

export default function Products() {
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState<Product | null>(null);
  const r = useAsync(() => api.products({ q: dq, category: cat }), [dq, cat]);
  const cats = r.data?.categories ?? [];
  return (
    <>
      <PageHeader icon="🛒" title="Agricultural Products" lead="Seeds, fertilizers, sprayers, irrigation and tools. Each item links to the seller's own page — CropNexus does not sell or ship anything." />
      <div className="card mb-5 grid gap-3 sm:grid-cols-[1fr_16rem]" role="search">
        <div className="field !mb-0"><label htmlFor="pr-q">Search products</label><input id="pr-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. chilli seeds, drip, sprayer" maxLength={80} /></div>
        <div className="field !mb-0"><label htmlFor="pr-c">Category</label><select id="pr-c" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories{r.data ? ` (${r.data.total})` : ""}</option>{cats.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}</select></div>
      </div>
      {r.loading && !r.data ? <Loading /> : r.error && !r.data ? <ErrorBox message={r.error} onRetry={r.reload} /> : !r.data?.items.length ? (
        <Empty icon="🔍" title="No products found">Try a different word or choose “All categories”.<div className="mt-3"><button type="button" className="btn btn-ghost" onClick={() => { setQ(""); setCat(""); }}>Clear search</button></div></Empty>
      ) : (
        <>
          <p className="muted text-sm" aria-live="polite">{r.data.items.length} of {r.data.total} products</p>
          <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {r.data.items.map((p) => (
              <li key={p.id} className="card flex flex-col !p-0 overflow-hidden">
                <Img p={p} className="h-44 w-full" />
                <div className="flex flex-1 flex-col p-4">
                  <Tag tone="green">{p.category}</Tag>
                  <h3 className="!mb-1 !mt-2 line-clamp-2 !text-base">{p.name}</h3>
                  <p className="muted m-0 line-clamp-3 text-sm">{p.description}</p>
                  <p className="m-0 mt-auto pt-3 text-sm">{money(p) ? <b className="text-lg">{money(p)}</b> : <span className="muted">Price on seller's site</span>}{p.seller && <span className="muted"> · {p.seller}</span>}</p>
                  <div className="mt-3 flex gap-2"><button type="button" className="btn btn-ghost btn-sm flex-1" onClick={() => setOpen(p)} aria-haspopup="dialog">Details</button>
                    <a className="btn btn-primary btn-sm flex-1" href={p.purchaseUrl} target="_blank" rel="noopener noreferrer">View on {hostOf(p.purchaseUrl) || "seller"} ↗</a></div>
                </div>
              </li>))}
          </ul>
        </>
      )}
      <Attribution>Product details, prices and availability come from the sellers' public pages and were checked on the date shown in each product's details. They can change at any time — always confirm on the seller's site. CropNexus is not affiliated with, and does not endorse, any listed brand or seller.</Attribution>
      {open && <Details p={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Details({ p, onClose }: { p: Product; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; if (el && !el.open) el.showModal(); }, []);
  const m = money(p);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }} aria-labelledby="prod-h" className="m-auto w-[min(40rem,calc(100vw-2rem))] max-h-[90vh] rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-black/50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
      <div className="grid gap-0 sm:grid-cols-[14rem_1fr]">
        <Img p={p} className="h-52 w-full sm:h-full sm:min-h-64" />
        <div className="p-6">
          <Tag tone="green">{p.category}</Tag>
          <h2 id="prod-h" className="!mb-2 !mt-2 !text-xl">{p.name}</h2>
          <p className="text-sm">{p.description}</p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {p.manufacturer && <><dt className="muted">Brand</dt><dd className="m-0 font-medium">{p.manufacturer}</dd></>}
            {p.seller && <><dt className="muted">Seller</dt><dd className="m-0 font-medium">{p.seller}</dd></>}
            <dt className="muted">Price</dt><dd className="m-0 font-medium">{m ?? "See seller's page"}</dd>
            {p.verifiedAt && <><dt className="muted">Checked</dt><dd className="m-0">{fmtDate(p.verifiedAt)}</dd></>}
          </dl>
          <p className="muted mt-3 text-xs">⚠ Prices and stock change often. You will leave CropNexus when you open the seller's page.</p>
          <div className="mt-4 flex flex-wrap gap-2"><a className="btn btn-primary" href={p.purchaseUrl} target="_blank" rel="noopener noreferrer">Open seller's page ↗</a>
            {p.sourceUrl && p.sourceUrl !== p.purchaseUrl && <a className="btn btn-ghost" href={p.sourceUrl} target="_blank" rel="noopener noreferrer">Source ↗</a>}
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>Close</button></div>
        </div>
      </div>
    </dialog>
  );
}
