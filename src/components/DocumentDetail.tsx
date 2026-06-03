"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DocumentRow } from "@/lib/types";
import {
  classificationColor,
  formatAmount,
  formatBytes,
  formatDate,
  statusColor,
} from "@/lib/format";

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

  // Poll while processing.
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
      <div className="py-12 text-center text-slate-500">
        Document not found. <Link href="/" className="underline">Back to dashboard</Link>
      </div>
    );
  }
  if (!doc) return <p className="py-12 text-center text-sm text-slate-400">Loading…</p>;

  const isImage = doc.mime_type.startsWith("image/");
  const isPdf = doc.mime_type === "application/pdf";

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-slate-500 underline">
        ← Back
      </Link>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{doc.vendor || doc.original_name}</h1>
          <p className="text-sm text-slate-400">{doc.original_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor(doc.status)}`}>
            {doc.status}
          </span>
          <button onClick={reprocess} className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">
            Reprocess
          </button>
          <button onClick={remove} className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>

      {doc.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Processing failed: {doc.error}
        </div>
      )}

      {/* Extracted fields */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Category">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${classificationColor(doc.classification)}`}>
            {doc.classification || "unclassified"}
          </span>
        </Field>
        <Field label="Amount">{formatAmount(doc.amount, doc.currency)}</Field>
        <Field label="Date">{formatDate(doc.doc_date)}</Field>
        <Field label="Source">
          {doc.source === "email" ? `Email${doc.sender_email ? ` · ${doc.sender_email}` : ""}` : "Uploaded"}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Preview</span>
            <a href={`/api/documents/${id}/file`} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
              Open original ({formatBytes(doc.size)})
            </a>
          </div>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/documents/${id}/file`} alt={doc.original_name} className="max-h-[480px] w-full rounded-lg object-contain" />
          ) : isPdf ? (
            <iframe src={`/api/documents/${id}/file`} className="h-[480px] w-full rounded-lg border" title={doc.original_name} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No inline preview available.</p>
          )}
        </div>

        {/* Insights */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex gap-3 border-b border-slate-100 pb-2 text-sm">
            <button
              onClick={() => setTab("summary")}
              className={tab === "summary" ? "font-semibold text-slate-900" : "text-slate-400"}
            >
              Summary & insights
            </button>
            <button
              onClick={() => setTab("text")}
              className={tab === "text" ? "font-semibold text-slate-900" : "text-slate-400"}
            >
              OCR text
            </button>
          </div>
          {tab === "summary" ? (
            doc.summary ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{doc.summary}</p>
            ) : (
              <p className="text-sm text-slate-400">
                {doc.status === "done" ? "No summary returned." : "Waiting for analysis…"}
              </p>
            )
          ) : (
            <pre className="max-h-[440px] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">
              {doc.ocr_text || (doc.status === "done" ? "No text extracted." : "Waiting for OCR…")}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}
