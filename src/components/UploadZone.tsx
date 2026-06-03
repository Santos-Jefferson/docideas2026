"use client";

import { useCallback, useRef, useState } from "react";

export default function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setBusy(true);
      setMessage(null);
      try {
        const fd = new FormData();
        for (const f of list) fd.append("files", f);
        const resp = await fetch("/api/documents/upload", { method: "POST", body: fd });
        const data = await resp.json();
        if (!resp.ok || !data.ok) throw new Error(data.error || "Upload failed");
        const skipped = (data.skipped || []) as { name: string; reason: string }[];
        const parts = [`Uploaded ${data.created.length} file(s).`];
        if (skipped.length) parts.push(`Skipped ${skipped.length}: ${skipped.map((s) => s.name).join(", ")}`);
        setMessage(parts.join(" "));
        onUploaded();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [onUploaded]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files) upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragging ? "border-slate-900 bg-slate-50" : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.tif,.tiff,.bmp"
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
        <div className="text-sm font-medium text-slate-700">
          {busy ? "Uploading…" : "Drop receipts / PDFs / images here, or click to choose"}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Each file is OCR'd, summarized and classified automatically.
        </div>
      </div>
      {message && <p className="mt-2 text-xs text-slate-500">{message}</p>}
    </div>
  );
}
