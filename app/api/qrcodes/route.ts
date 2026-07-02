import { prisma } from "@/lib/prisma";
import { apiHandler, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { qrCodeSchema } from "@/lib/validators";

export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  const qrCodes = await prisma.qrCode.findMany({
    where: { restaurantId: user.restaurantId },
    include: { table: { select: { id: true, name: true, zone: true } } },
    orderBy: { createdAt: "asc" },
  });
  return json(qrCodes);
});

export const POST = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const data = await parseBody(request, qrCodeSchema);
  const qrCode = await prisma.qrCode.create({
    data: {
      restaurantId: user.restaurantId,
      label: data.label,
      tableId: data.tableId ?? null,
    },
    include: { table: { select: { id: true, name: true, zone: true } } },
  });
  return json(qrCode, 201);
});
