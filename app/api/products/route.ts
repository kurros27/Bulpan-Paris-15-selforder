import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { logActivity } from "@/lib/audit";

export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  const products = await prisma.product.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      category: { select: { id: true, name: true } },
      optionGroups: { orderBy: { sortOrder: "asc" }, include: { choices: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  return json(products);
});

export const POST = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const data = await parseBody(request, productSchema);

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, restaurantId: user.restaurantId },
  });
  if (!category) return errorJson("Catégorie introuvable", 404);

  const count = await prisma.product.count({ where: { categoryId: category.id } });
  const product = await prisma.product.create({
    data: {
      restaurantId: user.restaurantId,
      categoryId: category.id,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      imageUrl: data.imageUrl ?? null,
      isAvailable: data.isAvailable ?? true,
      prepTimeMinutes: data.prepTimeMinutes ?? 10,
      allergens: data.allergens ?? [],
      tags: data.tags ?? [],
      vatRate: data.vatRate ?? 10,
      sortOrder: count,
      optionGroups: data.optionGroups
        ? {
            create: data.optionGroups.map((group, gi) => ({
              name: group.name,
              isRequired: group.isRequired,
              minSelect: group.minSelect,
              maxSelect: group.maxSelect,
              sortOrder: gi,
              choices: {
                create: group.choices.map((choice, ci) => ({
                  name: choice.name,
                  priceDelta: choice.priceDelta,
                  isAvailable: choice.isAvailable ?? true,
                  sortOrder: ci,
                })),
              },
            })),
          }
        : undefined,
    },
    include: { optionGroups: { include: { choices: true } } },
  });

  await logActivity({
    action: "product.create",
    restaurantId: user.restaurantId,
    userId: user.id,
    entity: "Product",
    entityId: product.id,
    details: { name: product.name },
  });
  return json(product, 201);
});
