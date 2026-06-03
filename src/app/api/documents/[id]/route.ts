import { NextRequest, NextResponse } from "next/server";
import { deleteDocument, getByPublicId } from "@/lib/repo";
import { deleteFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const doc = getByPublicId(params.id);
  if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, document: doc });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const doc = getByPublicId(params.id);
  if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  deleteDocument(doc.id);
  deleteFile(doc.stored_name);
  return NextResponse.json({ ok: true });
}
