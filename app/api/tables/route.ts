import { prisma } from "@/lib/prisma";
import { apiHandler, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { tableSchema } from "@/lib/validators";

export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  const tables = await prisma.table.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: { name: "asc" },
  });
  return json(tables);
});

export const POST = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const data = await parseBody(request, tableSchema);
  const table = await prisma.table.create({
    data: { restaurantId: user.restaurantId, name: data.name, zone: data.zone ?? null },
  });
  return json(table, 201);
});
