import { useState } from "react";
import { api, type Scheme } from "../api";
import { Attribution, Empty, ErrorBox, Loading, Note, PageHeader, Tabs, Tag, fmtDate, fmtDateTime, useAsync, useDebounced } from "../components/ui";

const statusTag = (s: Scheme["status"]) => s === "active" ? <Tag tone="green">Active</Tag> : s === "closed" ? <Tag tone="red">Closed</Tag> : <Tag tone="amber">Status unconfirmed</Tag>;

export default function Resources() {
  const [tab, setTab] = useState<"schemes" | "news">("schemes");
  return (
    <>
      <PageHeader icon="🏛️" title="Farming Resources" lead="Government schemes, subsidies and loans with links to the official pages, plus the latest agriculture news from public feeds." />
      <Tabs idBase="rs" label="Resource types" value={tab} onChange={setTab} tabs={[{ id: "schemes", label: "Schemes & subsidies" }, { id: "news", label: "Agriculture news" }]} />
      <div id="rs-panel" role="tabpanel" aria-labelledby={`rs-tab-${tab}`}>{tab === "schemes" ? <Schemes /> : <News />}</div>
    </>
  );
}

function Schemes() {
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [level, setLevel] = useState(""); const [type, setType] = useState("");
  const r = useAsync(() => api.schemes({ q: dq, level, type }), [dq, level, type]);
  return (
    <>
      <div className="card mb-5 grid gap-3 sm:grid-cols-[1fr_11rem_13rem]" role="search">
        <div className="field !mb-0"><label htmlFor="sc-q">Search schemes</label><input id="sc-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. insurance, irrigation, loan" maxLength={80} /></div>
        <div className="field !mb-0"><label htmlFor="sc-l">Level</label><select id="sc-l" value={level} onChange={(e) => setLevel(e.target.value)}><option value="">All</option><option value="central">Central</option><option value="state">State</option></select></div>
        <div className="field !mb-0"><label htmlFor="sc-t">Type</label><select id="sc-t" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{r.data?.types.map((t) => <option key={t}>{t}</option>)}</select></div>
      </div>
      {r.data && <Note kind="warn">{r.data.note}</Note>}
      {r.loading && !r.data ? <Loading /> : r.error && !r.data ? <ErrorBox message={r.error} onRetry={r.reload} /> : !r.data?.items.length ? <Empty icon="🔍" title="No schemes found">Try a different word or clear the filters. The list is curated and does not include every state scheme.</Empty> : (
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
          {r.data.items.map((s) => (
            <li key={s.id} className="card flex flex-col">
              <p className="m-0 flex flex-wrap gap-2"><Tag tone="slate">{s.level === "central" ? "Central" : "State"} · {s.state}</Tag><Tag tone="slate">{s.type}</Tag>{statusTag(s.status)}</p>
              <h3 className="!mb-1 !mt-2">{s.name}</h3>
              {s.description && <p className="m-0 text-sm">{s.description}</p>}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-semibold text-brand-700 dark:text-brand-300">Eligibility, benefits &amp; how to apply</summary>
                <dl className="m-0 mt-2 grid gap-2">
                  {s.eligibility && <div><dt className="font-semibold">Who can apply</dt><dd className="m-0">{s.eligibility}</dd></div>}
                  {s.benefits && <div><dt className="font-semibold">Benefits</dt><dd className="m-0">{s.benefits}</dd></div>}
                  {s.howToApply && <div><dt className="font-semibold">How to apply</dt><dd className="m-0">{s.howToApply}</dd></div>}
                </dl>
              </details>
              <p className="muted m-0 mt-auto pt-3 text-xs">{s.sourceName ? `Source: ${s.sourceName}. ` : ""}{s.lastVerified ? `Checked ${fmtDate(s.lastVerified)}.` : ""}</p>
              <a className="btn btn-primary btn-sm mt-2 self-start" href={s.officialUrl} target="_blank" rel="noopener noreferrer">Official page ↗</a>
            </li>))}
        </ul>
      )}
    </>
  );
}

function News() {
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const r = useAsync(() => api.news(dq), [dq]);
  return (
    <>
      <div className="card mb-5"><div className="field !mb-0"><label htmlFor="nw-q">Search news</label><input id="nw-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. monsoon, wheat, MSP" maxLength={80} /></div></div>
      {r.loading && !r.data ? <Loading label="Loading news…" /> : r.error && !r.data ? <ErrorBox message={r.error} onRetry={r.reload} /> : (
        <>
          {r.data?.note && <Note kind="warn">{r.data.note}</Note>}
          {!!r.data?.failed.length && <Note kind="warn">Could not load: {r.data.failed.join(", ")}. Showing the sources that responded.</Note>}
          {!r.data?.items.length ? <Empty icon="📰" title="No news to show">{q ? "No article matches your search." : "The news feeds did not return any articles right now. Please try again later."}</Empty> : (
            <ul className="m-0 grid list-none gap-3 p-0">
              {r.data.items.map((n) => (
                <li key={n.link} className="card !p-4">
                  <p className="muted m-0 text-xs">{n.source}{n.published ? ` · ${fmtDate(n.published)}` : ""}</p>
                  <h3 className="!mb-1 !mt-1 !text-base"><a href={n.link} target="_blank" rel="noopener noreferrer">{n.title} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></h3>
                  {n.summary && <p className="m-0 line-clamp-3 text-sm">{n.summary}</p>}
                </li>))}
            </ul>
          )}
          {r.data && <Attribution>Headlines and short summaries are supplied by the publishers' public RSS feeds{r.data.sources.length ? ` (${r.data.sources.map((s) => s.name).join(", ")})` : ""}; the full articles belong to them. {r.data.fetchedAt && `Updated ${fmtDateTime(r.data.fetchedAt)}.`} CropNexus does not verify these articles.</Attribution>}
        </>
      )}
    </>
  );
}
