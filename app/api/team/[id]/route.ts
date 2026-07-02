import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { hashPassword, requireRestaurantUser } from "@/lib/auth";
import { teamMemberUpdateSchema } from "@/lib/validators";
import { logActivity } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: Request, { params }: Params) => {
  const user = await requireRestaurantUser(["ADMIN"]);
  const { id } = await params;
  const data = await parseBody(request, teamMemberUpdateSchema);

  const member = await prisma.user.findFirst({ where: { id, restaurantId: user.restaurantId } });
  if (!member) return errorJson("Membre introuvable", 404);
  if (member.id === user.id && data.isActive === false) {
    return errorJson("Impossible de désactiver votre propre compte", 400);
  }

  const { password, ...fields } = data;
  const updated = await prisma.user.update({
    where: { id },
    data: { ...fields, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  await logActivity({
    action: "team.update",
    restaurantId: user.restaurantId,
    userId: user.id,
    entity: "User",
    entityId: id,
  });
  return json(updated);
});

export const DELETE = apiHandler(async (_request: Request, { params }: Params) => {
  const user = await requireRestaurantUser(["ADMIN"]);
  const { id } = await params;
  if (id === user.id) return errorJson("Impossible de supprimer votre propre compte", 400);

  const member = await prisma.user.findFirst({ where: { id, restaurantId: user.restaurantId } });
  if (!member) return errorJson("Membre introuvable", 404);

  await prisma.user.delete({ where: { id } });
  await logActivity({
    action: "team.delete",
    restaurantId: user.restaurantId,
    userId: user.id,
    entity: "User",
    entityId: id,
    details: { email: member.email },
  });
  return json({ ok: true });
});
