"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DocumentRow, Stats } from "@/lib/types";
import { classificationColor, formatAmount, formatDate, statusColor } from "@/lib/format";
import UploadZone from "./UploadZone";

interface Filters {
  q: string;
  classification: string;
  source: string;
  minAmount: string;
  maxAmount: string;
  sort: string;
}

const EMPTY: Filters = { q: "", classification: "", source: "", minAmount: "", maxAmount: "", sort: "newest" };

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.q) p.set("q", filters.q);
    if (filters.classification) p.set("classification", filters.classification);
    if (filters.source) p.set("source", filters.source);
    if (filters.minAmount) p.set("minAmount", filters.minAmount);
    if (filters.maxAmount) p.set("maxAmount", filters.maxAmount);
    if (filters.sort) p.set("sort", filters.sort);
    return p.toString();
  }, [filters]);

  const load = useCallback(async () => {
    const [docsResp, statsResp] = await Promise.all([
      fetch(`/api/documents?${queryString}`, { cache: "no-store" }),
      fetch(`/api/stats`, { cache: "no-store" }),
    ]);
    const docsData = await docsResp.json();
    const statsData = await statsResp.json();
    if (docsData.ok) {
      setDocs(docsData.documents);
      setTotal(docsData.total);
    }
    if (statsData.ok) setStats(statsData.stats);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 250);
    return () => clearTimeout(debounce.current);
  }, [load]);

  const checkHealth = useCallback(async () => {
    try {
      const resp = await fetch("/api/health", { cache: "no-store" });
      const data = await resp.json();
      setApiUp(Boolean(data.docinsights));
    } catch {
      setApiUp(false);
    }
  }, []);
  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 30000);
    return () => clearInterval(id);
  }, [checkHealth]);

  const hasActive = docs.some((d) => d.status === "pending" || d.status === "processing");
  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [hasActive, load]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const activeFilterCount =
    (filters.source ? 1 : 0) + (filters.minAmount ? 1 : 0) + (filters.maxAmount ? 1 : 0) + (filters.sort !== "newest" ? 1 : 0);

  return (
    <div className="space-y-5">
      <ApiStatus up={apiUp} onRecheck={checkHealth} />

      <UploadZone onUploaded={load} />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Documents" value={String(stats.total)} />
          <StatCard label="Tracked spend" value={formatAmount(stats.totalAmount, "USD")} />
          <StatCard label="Processing" value={String((stats.byStatus.pending || 0) + (stats.byStatus.processing || 0))} />
          <StatCard label="Needs attention" value={String(stats.byStatus.error || 0)} accent={(stats.byStatus.error || 0) > 0} />
        </div>
      )}

      {/* Category chips — horizontally scrollable on mobile */}
      {stats && stats.byClassification.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={!filters.classification} onClick={() => set({ classification: "" })} label={`All ${stats.total}`} />
          {stats.byClassification.map((c) => (
            <Chip
              key={c.classification}
              active={filters.classification === c.classification}
              onClick={() => set({ classification: filters.classification === c.classification ? "" : c.classification })}
              label={`${c.classification} ${c.count}`}
            />
          ))}
        </div>
      )}

      {/* Search */}
      <div className="space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">⌕</span>
          <input
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            inputMode="search"
            placeholder="Search amount, place, text…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-base shadow-soft outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-ink shadow-soft"
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <span className="text-xs text-muted">{total} result{total === 1 ? "" : "s"}</span>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="w-16 shrink-0">Amount</span>
              <input
                type="number"
                inputMode="decimal"
                value={filters.minAmount}
                onChange={(e) => set({ minAmount: e.target.value })}
                placeholder="min"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
              <input
                type="number"
                inputMode="decimal"
                value={filters.maxAmount}
                onChange={(e) => set({ maxAmount: e.target.value })}
                placeholder="max"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="w-16 shrink-0">Source</span>
              <select
                value={filters.source}
                onChange={(e) => set({ source: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">Any</option>
                <option value="upload">Uploaded</option>
                <option value="email">Email</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2">
              <span className="w-16 shrink-0">Sort by</span>
              <select
                value={filters.sort}
                onChange={(e) => set({ sort: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount_desc">Amount: high → low</option>
                <option value="amount_asc">Amount: low → high</option>
              </select>
            </label>
            {(filters.q || filters.classification || activeFilterCount > 0) && (
              <button onClick={() => set(EMPTY)} className="text-left text-sm font-medium text-brand-600 underline sm:col-span-2">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Document list */}
      {loading ? (
        <p className="py-16 text-center text-sm text-muted">Loading…</p>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-muted">No documents yet.</p>
          <p className="mt-1 text-xs text-muted">Add one above, or forward a receipt by email.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <DocCard key={d.public_id} doc={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApiStatus({ up, onRecheck }: { up: boolean | null; onRecheck: () => void }) {
  if (up === null) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-muted shadow-soft">
        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
        Checking DocInsights API…
      </div>
    );
  }
  if (up) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        DocInsights API reachable — documents process automatically.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
      <span className="min-w-0 flex-1">
        API unreachable. Uploads are saved but won&apos;t be analyzed until you&apos;re on the Synchronoss network (SIP).
      </span>
      <button onClick={onRecheck} className="rounded-full border border-amber-400 px-3 py-1 font-medium hover:bg-amber-100">
        Re-check
      </button>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-card ${accent ? "border-red-200" : "border-slate-100"}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ? "text-red-600" : "text-ink"}`}>{value}</div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition ${
        active ? "bg-brand-500 text-white shadow-soft" : "bg-white text-muted ring-1 ring-slate-200 hover:ring-brand-300"
      }`}
    >
      {label}
    </button>
  );
}

function DocCard({ doc }: { doc: DocumentRow }) {
  return (
    <Link
      href={`/documents/${doc.public_id}`}
      className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition active:scale-[0.99] hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink" title={doc.original_name}>
            {doc.vendor || doc.original_name}
          </div>
          <div className="truncate text-xs text-muted">{doc.original_name}</div>
        </div>
        {doc.amount !== null ? (
          <span className="shrink-0 text-base font-bold text-ink">{formatAmount(doc.amount, doc.currency)}</span>
        ) : (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(doc.status)}`}>
            {doc.status}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${classificationColor(doc.classification)}`}>
          {doc.classification || "unclassified"}
        </span>
        {doc.doc_date && <span className="text-xs text-muted">{formatDate(doc.doc_date)}</span>}
        {doc.source === "email" && <span className="text-[11px] text-muted">✉ email</span>}
        {doc.amount !== null && doc.status !== "done" && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(doc.status)}`}>{doc.status}</span>
        )}
      </div>

      {doc.summary && <p className="mt-2.5 line-clamp-2 text-sm text-muted">{doc.summary}</p>}
      {doc.status === "error" && <p className="mt-2 line-clamp-2 text-xs text-red-600">{doc.error}</p>}
    </Link>
  );
}
