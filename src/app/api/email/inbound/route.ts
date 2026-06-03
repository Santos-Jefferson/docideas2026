import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { extOf, isSupported, mimeFor, saveFile } from "@/lib/storage";
import { createDocument } from "@/lib/repo";
import { processInBackground } from "@/lib/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inbound email webhook.
 *
 * Point a "forward-to-address" inbound parse service (SendGrid Inbound Parse,
 * Mailgun Routes, Postmark inbound, etc.) at:
 *     POST /api/email/inbound?token=YOUR_INBOUND_EMAIL_TOKEN
 *
 * Two body formats are accepted:
 *   1. multipart/form-data  — attachments arrive as File parts; sender/subject
 *      come from common field names (from/sender/subject). (SendGrid/Mailgun)
 *   2. application/json      — { from, subject, attachments: [{ filename, base64 }] }
 *      for custom forwarders.
 *
 * Every supported attachment becomes a document and is queued for processing.
 */
export async function POST(req: NextRequest) {
  if (config.inboundEmailToken) {
    const token = req.nextUrl.searchParams.get("token");
    if (token !== config.inboundEmailToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const attachments: { name: string; buffer: Buffer }[] = [];
    let sender: string | null = null;
    let subject: string | null = null;

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as {
        from?: string;
        sender?: string;
        subject?: string;
        attachments?: { filename?: string; name?: string; base64?: string; content?: string }[];
      };
      sender = body.from || body.sender || null;
      subject = body.subject || null;
      for (const a of body.attachments ?? []) {
        const name = a.filename || a.name;
        const data = a.base64 || a.content;
        if (name && data) attachments.push({ name, buffer: Buffer.from(data, "base64") });
      }
    } else {
      // multipart/form-data (or urlencoded) — works for SendGrid & Mailgun.
      const form = await req.formData();
      sender = str(form.get("from")) || str(form.get("sender")) || null;
      subject = str(form.get("subject")) || null;
      for (const [, value] of form.entries()) {
        if (value instanceof File && value.size > 0) {
          attachments.push({ name: value.name, buffer: Buffer.from(await value.arrayBuffer()) });
        }
      }
    }

    const created: string[] = [];
    const skipped: { name: string; reason: string }[] = [];

    for (const att of attachments) {
      if (!isSupported(att.name)) {
        skipped.push({ name: att.name, reason: "Unsupported type" });
        continue;
      }
      if (att.buffer.length > config.maxUploadBytes) {
        skipped.push({ name: att.name, reason: "Too large" });
        continue;
      }
      const { storedName, size } = saveFile(att.name, att.buffer);
      const doc = createDocument({
        original_name: att.name,
        stored_name: storedName,
        mime_type: mimeFor(att.name),
        ext: extOf(att.name),
        size,
        source: "email",
        sender_email: sender,
        subject,
      });
      processInBackground(doc.id);
      created.push(doc.public_id);
    }

    return NextResponse.json({ ok: true, ingested: created.length, created, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function str(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" ? v : null;
}
