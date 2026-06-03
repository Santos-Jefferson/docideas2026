import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/docinsights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const docinsights = await healthCheck();
  return NextResponse.json({ ok: true, docinsights });
}
