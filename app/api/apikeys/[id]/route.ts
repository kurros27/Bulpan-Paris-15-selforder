import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export const DELETE = apiHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRestaurantUser(["ADMIN"]);
    const { id } = await params;
    const existing = await prisma.apiKey.findFirst({
      where: { id, restaurantId: user.restaurantId },
    });
    if (!existing) return errorJson("Clé introuvable", 404);
    await prisma.apiKey.delete({ where: { id } });
    await logActivity({
      action: "apikey.delete",
      restaurantId: user.restaurantId,
      userId: user.id,
      entity: "ApiKey",
      entityId: id,
    });
    return json({ ok: true });
  }
);
