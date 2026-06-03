import { NextRequest, NextResponse } from "next/server";
import { getByPublicId } from "@/lib/repo";
import { fileBuffer } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const doc = getByPublicId(params.id);
  if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  try {
    const buf = fileBuffer(doc.stored_name);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": doc.mime_type,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.original_name)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "File missing on disk" }, { status: 410 });
  }
}
