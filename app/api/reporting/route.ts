import { NextRequest, NextResponse } from "next/server";
import { getDashboardSummary } from "../../../lib/server/data-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }
  const summary = getDashboardSummary(date);
  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}
