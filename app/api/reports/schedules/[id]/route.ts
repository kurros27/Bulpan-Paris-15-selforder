import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { reportScheduleSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: Request, { params }: Params) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const { id } = await params;
  const data = await parseBody(request, reportScheduleSchema.partial());
  const existing = await prisma.reportSchedule.findFirst({
    where: { id, restaurantId: user.restaurantId },
  });
  if (!existing) return errorJson("Planification introuvable", 404);
  return json(await prisma.reportSchedule.update({ where: { id }, data }));
});

export const DELETE = apiHandler(async (_request: Request, { params }: Params) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const { id } = await params;
  const existing = await prisma.reportSchedule.findFirst({
    where: { id, restaurantId: user.restaurantId },
  });
  if (!existing) return errorJson("Planification introuvable", 404);
  await prisma.reportSchedule.delete({ where: { id } });
  return json({ ok: true });
});
