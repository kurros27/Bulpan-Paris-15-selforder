import { NextResponse } from "next/server";
import { getMenuData } from "../../../lib/server/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const menu = getMenuData();
  return NextResponse.json(menu, { headers: { "Cache-Control": "no-store" } });
}
