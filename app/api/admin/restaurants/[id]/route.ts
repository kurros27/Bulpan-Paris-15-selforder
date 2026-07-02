import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { adminRestaurantUpdateSchema } from "@/lib/validators";
import { logActivity } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: Request, { params }: Params) => {
  const admin = await requireUser(["SUPER_ADMIN"]);
  const { id } = await params;
  const data = await parseBody(request, adminRestaurantUpdateSchema);

  const existing = await prisma.restaurant.findUnique({ where: { id } });
  if (!existing) return errorJson("Restaurant introuvable", 404);

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: {
      ...data,
      subscriptionEndsAt:
        data.subscriptionEndsAt === undefined
          ? undefined
          : data.subscriptionEndsAt
            ? new Date(data.subscriptionEndsAt)
            : null,
    },
  });

  await logActivity({
    action: "admin.restaurant.update",
    restaurantId: id,
    userId: admin.id,
    details: data as Record<string, unknown>,
  });
  return json(restaurant);
});

export const DELETE = apiHandler(async (_request: Request, { params }: Params) => {
  const admin = await requireUser(["SUPER_ADMIN"]);
  const { id } = await params;

  const existing = await prisma.restaurant.findUnique({ where: { id } });
  if (!existing) return errorJson("Restaurant introuvable", 404);

  await prisma.restaurant.delete({ where: { id } });
  await logActivity({
    action: "admin.restaurant.delete",
    userId: admin.id,
    details: { name: existing.name, slug: existing.slug },
  });
  return json({ ok: true });
});
