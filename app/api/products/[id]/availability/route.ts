import { NextRequest, NextResponse } from "next/server";
import { setProductAvailability } from "../../../../../lib/server/data-store";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const product = setProductAvailability(params.id, body.isAvailable, body.actor ?? "manager");
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
