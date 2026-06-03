import { NextRequest, NextResponse } from "next/server";
import { getByPublicId, setStatus } from "@/lib/repo";
import { processInBackground } from "@/lib/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const doc = getByPublicId(params.id);
  if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  setStatus(doc.id, "pending", null);
  processInBackground(doc.id);
  return NextResponse.json({ ok: true });
}
