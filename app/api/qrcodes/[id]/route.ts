import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";

export const DELETE = apiHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRestaurantUser(MANAGER_ROLES);
    const { id } = await params;
    const existing = await prisma.qrCode.findFirst({
      where: { id, restaurantId: user.restaurantId },
    });
    if (!existing) return errorJson("QR Code introuvable", 404);
    await prisma.qrCode.delete({ where: { id } });
    return json({ ok: true });
  }
);
