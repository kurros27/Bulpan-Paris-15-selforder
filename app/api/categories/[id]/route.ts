import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { categorySchema } from "@/lib/validators";
import { logActivity } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: Request, { params }: Params) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const { id } = await params;
  const data = await parseBody(request, categorySchema.partial());

  const existing = await prisma.category.findFirst({
    where: { id, restaurantId: user.restaurantId },
  });
  if (!existing) return errorJson("Catégorie introuvable", 404);

  const category = await prisma.category.update({ where: { id }, data });
  await logActivity({
    action: "category.update",
    restaurantId: user.restaurantId,
    userId: user.id,
    entity: "Category",
    entityId: id,
  });
  return json(category);
});

export const DELETE = apiHandler(async (_request: Request, { params }: Params) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const { id } = await params;

  const existing = await prisma.category.findFirst({
    where: { id, restaurantId: user.restaurantId },
  });
  if (!existing) return errorJson("Catégorie introuvable", 404);

  await prisma.category.delete({ where: { id } });
  await logActivity({
    action: "category.delete",
    restaurantId: user.restaurantId,
    userId: user.id,
    entity: "Category",
    entityId: id,
    details: { name: existing.name },
  });
  return json({ ok: true });
});
