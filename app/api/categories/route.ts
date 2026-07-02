import { prisma } from "@/lib/prisma";
import { apiHandler, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { categorySchema } from "@/lib/validators";
import { logActivity } from "@/lib/audit";

export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  const categories = await prisma.category.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: { optionGroups: { orderBy: { sortOrder: "asc" }, include: { choices: { orderBy: { sortOrder: "asc" } } } } },
      },
    },
  });
  return json(categories);
});

export const POST = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const data = await parseBody(request, categorySchema);
  const count = await prisma.category.count({ where: { restaurantId: user.restaurantId } });
  const category = await prisma.category.create({
    data: {
      restaurantId: user.restaurantId,
      name: data.name,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? count,
    },
  });
  await logActivity({
    action: "category.create",
    restaurantId: user.restaurantId,
    userId: user.id,
    entity: "Category",
    entityId: category.id,
    details: { name: category.name },
  });
  return json(category, 201);
});
