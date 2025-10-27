import { NextRequest, NextResponse } from "next/server";
import { createOrder, getOrders } from "../../../lib/server/data-store";
import { OrderStatus, PaymentMethod } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const paymentParam = searchParams.get("paymentMethod");
  const orders = getOrders({
    status: statusParam ? (statusParam as OrderStatus) : undefined,
    paymentMethod: paymentParam ? (paymentParam as PaymentMethod) : undefined,
  });
  return NextResponse.json(orders, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const order = createOrder(payload);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
