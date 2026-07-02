import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody, serialize } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";
import { orderStatusSchema } from "@/lib/validators";
import { publishToRestaurant } from "@/lib/events";
import { logActivity } from "@/lib/audit";
import type { OrderStatus } from "@/lib/generated/prisma/enums";

const TIMESTAMP_BY_STATUS: Partial<Record<OrderStatus, "acceptedAt" | "readyAt" | "servedAt" | "completedAt" | "cancelledAt">> = {
  ACCEPTED: "acceptedAt",
  READY: "readyAt",
  SERVED: "servedAt",
  COMPLETED: "completedAt",
  CANCELLED: "cancelledAt",
};

export const PATCH = apiHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRestaurantUser();
    const { id } = await params;
    const { status } = await parseBody(request, orderStatusSchema);

    const existing = await prisma.order.findFirst({
      where: { id, restaurantId: user.restaurantId },
    });
    if (!existing) return errorJson("Commande introuvable", 404);
    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      return errorJson("Cette commande est déjà clôturée", 409);
    }

    const timestampField = TIMESTAMP_BY_STATUS[status];
    const order = await prisma.order.update({
      where: { id },
      data: { status, ...(timestampField ? { [timestampField]: new Date() } : {}) },
      include: { items: true, table: { select: { name: true, zone: true } } },
    });

    if (status === "CANCELLED") {
      await prisma.notification.create({
        data: {
          restaurantId: user.restaurantId,
          type: "ORDER_CANCELLED",
          title: `Commande #${order.number} annulée`,
          body: order.customerName ? `Client : ${order.customerName}` : null,
        },
      });
    }

    publishToRestaurant(user.restaurantId, { kind: "order.updated", order: serialize(order) });
    await logActivity({
      action: "order.status",
      restaurantId: user.restaurantId,
      userId: user.id,
      entity: "Order",
      entityId: id,
      details: { from: existing.status, to: status },
    });
    return json(order);
  }
);
