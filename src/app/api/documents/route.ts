import { NextRequest, NextResponse } from "next/server";
import { listDocuments } from "@/lib/repo";
import { DocSource, DocStatus, ListFilters } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const num = (k: string): number | undefined => {
    const v = sp.get(k);
    if (v === null || v === "") return undefined;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const filters: ListFilters = {
    q: sp.get("q") || undefined,
    classification: sp.get("classification") || undefined,
    source: (sp.get("source") as DocSource) || undefined,
    status: (sp.get("status") as DocStatus) || undefined,
    minAmount: num("minAmount"),
    maxAmount: num("maxAmount"),
    sort: (sp.get("sort") as ListFilters["sort"]) || undefined,
    limit: num("limit"),
    offset: num("offset"),
  };

  try {
    const { rows, total } = listDocuments(filters);
    return NextResponse.json({ ok: true, total, documents: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
