import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { extOf, isSupported, mimeFor, saveFile } from "@/lib/storage";
import { createDocument } from "@/lib/repo";
import { processInBackground } from "@/lib/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    const single = form.get("file");
    if (single instanceof File) files.push(single);

    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: "No files provided" }, { status: 400 });
    }

    const created: { public_id: string; original_name: string }[] = [];
    const skipped: { name: string; reason: string }[] = [];

    for (const file of files) {
      if (!isSupported(file.name)) {
        skipped.push({ name: file.name, reason: "Unsupported file type (use PDF or image)" });
        continue;
      }
      if (file.size > config.maxUploadBytes) {
        skipped.push({ name: file.name, reason: "File too large" });
        continue;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const { storedName, size } = saveFile(file.name, buffer);
      const doc = createDocument({
        original_name: file.name,
        stored_name: storedName,
        mime_type: file.type || mimeFor(file.name),
        ext: extOf(file.name),
        size,
        source: "upload",
      });
      processInBackground(doc.id);
      created.push({ public_id: doc.public_id, original_name: doc.original_name });
    }

    return NextResponse.json({ ok: true, created, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
