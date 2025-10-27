import { NextRequest, NextResponse } from "next/server";
import { getMenuData, upsertProduct } from "../../../lib/server/data-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const product = upsertProduct(payload, payload.actor ?? "manager");
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json(getMenuData(), { headers: { "Cache-Control": "no-store" } });
}
