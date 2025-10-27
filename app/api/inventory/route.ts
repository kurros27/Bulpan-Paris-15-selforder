import { NextResponse } from "next/server";
import { getInventory } from "../../../lib/server/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getInventory(), { headers: { "Cache-Control": "no-store" } });
}
