import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "../../../lib/server/data-store";
import { PaymentMethod } from "../../../lib/types";

export const dynamic = "force-dynamic";

function toCsv(data: Record<string, string | number>[]) {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((key) => JSON.stringify(row[key] ?? "")).join(","));
  return [headers.join(","), ...rows].join("\n");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const paymentMethodParam = searchParams.get("paymentMethod");
  const method = paymentMethodParam ? (paymentMethodParam as PaymentMethod) : undefined;
  const orders = getOrders({ paymentMethod: method });
  const filtered = orders.filter((order) => {
    const createdAt = order.createdAt.slice(0, 10);
    if (from && createdAt < from) return false;
    if (to && createdAt > to) return false;
    return true;
  });
  const rows: Record<string, string | number>[] = filtered.map((order) => ({
    id: order.id,
    shortCode: order.shortCode,
    createdAt: order.createdAt,
    status: order.status,
    paymentMethod: order.payment.method,
    paymentStatus: order.payment.status,
    total: order.total,
    subtotal: order.subtotal,
    tax: order.tax,
    discount: order.discountAmount ?? 0,
    serviceType: order.serviceType,
  }));
  const csv = toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=bulpan-export.csv",
      "Cache-Control": "no-store",
    },
  });
}
