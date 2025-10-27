import { NextRequest, NextResponse } from "next/server";
import {
  captureCashPayment,
  getOrder,
  updateOrderStatus,
} from "../../../../lib/server/data-store";
import { OrderStatus } from "../../../../lib/types";

export const dynamic = "force-dynamic";

interface PatchBody {
  status?: string;
  action?: "capture_cash";
  actor?: string;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const order = getOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as PatchBody;
    const actor = body.actor ?? "staff";
    if (body.action === "capture_cash") {
      const order = captureCashPayment(params.id, actor);
      return NextResponse.json(order);
    }
    if (!body.status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }
    const allowedStatuses: OrderStatus[] = [
      "placed",
      "paid_waiting_cash",
      "paid",
      "in_kitchen",
      "ready",
      "served",
      "picked_up",
      "closed",
      "canceled",
    ];
    if (!allowedStatuses.includes(body.status as OrderStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const order = updateOrderStatus(params.id, body.status as OrderStatus, actor);
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
