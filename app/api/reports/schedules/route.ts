import { prisma } from "@/lib/prisma";
import { apiHandler, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { reportScheduleSchema } from "@/lib/validators";

export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  const schedules = await prisma.reportSchedule.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: { createdAt: "asc" },
  });
  return json(schedules);
});

export const POST = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const data = await parseBody(request, reportScheduleSchema);
  const schedule = await prisma.reportSchedule.create({
    data: { restaurantId: user.restaurantId, ...data },
  });
  return json(schedule, 201);
});
