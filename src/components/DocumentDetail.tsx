"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DocumentRow } from "@/lib/types";
import { classificationColor, formatAmount, formatBytes, formatDate, statusColor } from "@/lib/format";

export default function DocumentDetail({ id }: { id: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"summary" | "text">("summary");

  const load = useCallback(async () => {
    const resp = await fetch(`/api/documents/${id}`, { cache: "no-store" });
    if (resp.status === 404) {
      setNotFound(true);
      return;
    }
    const data = await resp.json();
    if (data.ok) setDoc(data.document);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!doc || (doc.status !== "pending" && doc.status !== "processing")) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [doc, load]);

  const reprocess = async () => {
    await fetch(`/api/documents/${id}/reprocess`, { method: "POST" });
    load();
  };

  const remove = async () => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    router.push("/");
  };

  if (notFound) {
    return (
      <div className="py-16 text-center text-muted">
        Document not found.{" "}
        <Link href="/" className="font-medium text-brand-600 underline">
          Back to documents
        </Link>
      </div>
    );
  }
  if (!doc) return <p className="py-16 text-center text-sm text-muted">Loading…</p>;

  const isImage = doc.mime_type.startsWith("image/");
  const isPdf = doc.mime_type === "application/pdf";

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        ← Documents
      </Link>

      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{doc.vendor || doc.original_name}</h1>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(doc.status)}`}>{doc.status}</span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">{doc.original_name}</p>
      </div>

      {doc.status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Processing failed: {doc.error}
        </div>
      )}

      {/* Extracted fields */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field label="Category">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classificationColor(doc.classification)}`}>
            {doc.classification || "unclassified"}
          </span>
        </Field>
        <Field label="Amount">{formatAmount(doc.amount, doc.currency)}</Field>
        <Field label="Date">{formatDate(doc.doc_date)}</Field>
        <Field label="Source">
          {doc.source === "email" ? `Email${doc.sender_email ? ` · ${doc.sender_email}` : ""}` : "Uploaded"}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Preview */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Preview</span>
            <a href={`/api/documents/${id}/file`} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 underline">
              Open original ({formatBytes(doc.size)})
            </a>
          </div>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/documents/${id}/file`} alt={doc.original_name} className="max-h-[60vh] w-full rounded-xl object-contain" />
          ) : isPdf ? (
            <iframe src={`/api/documents/${id}/file`} className="h-[60vh] w-full rounded-xl border border-slate-100" title={doc.original_name} />
          ) : (
            <p className="py-10 text-center text-sm text-muted">No inline preview available.</p>
          )}
        </div>

        {/* Insights */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-card">
          <div className="mb-3 flex gap-2">
            <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
              Insights
            </TabButton>
            <TabButton active={tab === "text"} onClick={() => setTab("text")}>
              OCR text
            </TabButton>
          </div>
          {tab === "summary" ? (
            doc.summary ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{doc.summary}</p>
            ) : (
              <p className="text-sm text-muted">{doc.status === "done" ? "No summary returned." : "Waiting for analysis…"}</p>
            )
          ) : (
            <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">
              {doc.ocr_text || (doc.status === "done" ? "No text extracted." : "Waiting for OCR…")}
            </pre>
          )}
        </div>
      </div>

      {/* Actions — sticky bottom bar on mobile */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <button
            onClick={reprocess}
            className="flex-1 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-brand-600 sm:flex-none sm:px-5"
          >
            Reprocess
          </button>
          <button
            onClick={remove}
            className="flex-1 rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 sm:flex-none sm:px-5"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-soft">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{children}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
