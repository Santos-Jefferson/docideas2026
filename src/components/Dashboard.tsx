"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DocumentRow, Stats } from "@/lib/types";
import {
  classificationColor,
  formatAmount,
  formatDate,
  statusColor,
} from "@/lib/format";
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
  const [apiUp, setApiUp] = useState<boolean | null>(null); // null = checking
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

  // Reload (debounced) whenever filters change.
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 250);
    return () => clearTimeout(debounce.current);
  }, [load]);

  // Check DocInsights connectivity on mount and every 30s.
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

  // Poll while anything is still being processed.
  const hasActive = docs.some((d) => d.status === "pending" || d.status === "processing");
  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [hasActive, load]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-6">
      <ApiStatus up={apiUp} onRecheck={checkHealth} />

      <UploadZone onUploaded={load} />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Documents" value={String(stats.total)} />
          <StatCard label="Tracked spend" value={formatAmount(stats.totalAmount, "USD")} />
          <StatCard
            label="Processing"
            value={String((stats.byStatus.pending || 0) + (stats.byStatus.processing || 0))}
          />
          <StatCard label="Errors" value={String(stats.byStatus.error || 0)} />
        </div>
      )}

      {/* Category chips */}
      {stats && stats.byClassification.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip
            active={!filters.classification}
            onClick={() => set({ classification: "" })}
            label={`All (${stats.total})`}
          />
          {stats.byClassification.map((c) => (
            <Chip
              key={c.classification}
              active={filters.classification === c.classification}
              onClick={() => set({ classification: c.classification })}
              label={`${c.classification} (${c.count})`}
              extra={c.total_amount ? formatAmount(c.total_amount, "USD") : undefined}
            />
          ))}
        </div>
      )}

      {/* Search + filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <input
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search across OCR text, vendor, summary… (e.g. “Starbucks”, “parking”, “invoice 4471”)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1 text-slate-500">
            Amount
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => set({ minAmount: e.target.value })}
              placeholder="min"
              className="w-20 rounded border border-slate-300 px-2 py-1"
            />
            –
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => set({ maxAmount: e.target.value })}
              placeholder="max"
              className="w-20 rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <select
            value={filters.source}
            onChange={(e) => set({ source: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="">Any source</option>
            <option value="upload">Uploaded</option>
            <option value="email">Email</option>
          </select>
          <select
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="amount_desc">Amount high→low</option>
            <option value="amount_asc">Amount low→high</option>
          </select>
          {(filters.q || filters.classification || filters.source || filters.minAmount || filters.maxAmount) && (
            <button onClick={() => set(EMPTY)} className="text-slate-500 underline">
              Clear
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400">{total} result(s)</span>
        </div>
      </div>

      {/* Document grid */}
      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">
          No documents yet. Upload one above to get started.
        </p>
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
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
        Checking DocInsights API…
      </div>
    );
  }
  if (up) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        DocInsights API reachable — documents will process automatically.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      <span>
        DocInsights API unreachable. Uploads are saved but won&apos;t be analyzed until you&apos;re on
        the Synchronoss network (SIP). Use <strong>Reprocess</strong> on a document once connected.
      </span>
      <button onClick={onRecheck} className="ml-auto rounded border border-amber-400 px-2 py-0.5 hover:bg-amber-100">
        Re-check
      </button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  extra,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  extra?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
        active ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
      }`}
    >
      {label}
      {extra && <span className={`ml-1 ${active ? "text-slate-300" : "text-slate-400"}`}>· {extra}</span>}
    </button>
  );
}

function DocCard({ doc }: { doc: DocumentRow }) {
  return (
    <Link
      href={`/documents/${doc.public_id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-900" title={doc.original_name}>
            {doc.vendor || doc.original_name}
          </div>
          <div className="truncate text-xs text-slate-400">{doc.original_name}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(doc.status)}`}>
          {doc.status}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${classificationColor(doc.classification)}`}>
          {doc.classification || "unclassified"}
        </span>
        {doc.amount !== null && (
          <span className="text-sm font-semibold text-slate-900">{formatAmount(doc.amount, doc.currency)}</span>
        )}
        {doc.doc_date && <span className="text-xs text-slate-400">{formatDate(doc.doc_date)}</span>}
        {doc.source === "email" && <span className="text-[10px] text-slate-400">✉ email</span>}
      </div>

      {doc.summary && <p className="mt-2 line-clamp-3 text-xs text-slate-500">{doc.summary}</p>}
      {doc.status === "error" && <p className="mt-2 text-xs text-red-600">{doc.error}</p>}
    </Link>
  );
}
