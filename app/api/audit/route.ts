import { NextResponse } from "next/server";
import { getAuditLog } from "../../../lib/server/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAuditLog(), { headers: { "Cache-Control": "no-store" } });
}
