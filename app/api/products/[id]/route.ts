import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { logActivity } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (request: Request, { params }: Params) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const { id } = await params;
  const data = await parseBody(request, productSchema.partial());

  const existing = await prisma.product.findFirst({
    where: { id, restaurantId: user.restaurantId },
  });
  if (!existing) return errorJson("Produit introuvable", 404);

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, restaurantId: user.restaurantId },
    });
    if (!category) return errorJson("Catégorie introuvable", 404);
  }

  const { optionGroups, ...fields } = data;

  const product = await prisma.$transaction(async (tx) => {
    // Les groupes d'options sont remplacés en bloc quand fournis
    if (optionGroups !== undefined) {
      await tx.optionGroup.deleteMany({ where: { productId: id } });
      for (const [gi, group] of optionGroups.entries()) {
        await tx.optionGroup.create({
          data: {
            productId: id,
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
          },
        });
      }
    }
    return tx.product.update({
      where: { id },
      data: fields,
      include: { optionGroups: { include: { choices: true } } },
    });
  });

  // Notification lorsqu'un produit passe indisponible
  if (data.isAvailable === false && existing.isAvailable) {
    await prisma.notification.create({
      data: {
        restaurantId: user.restaurantId,
        type: "PRODUCT_UNAVAILABLE",
        title: `Produit indisponible : ${existing.name}`,
        body: "Le produit a été masqué du menu client.",
      },
    });
  }

  await logActivity({
    action: "product.update",
    restaurantId: user.restaurantId,
    userId: user.id,
    entity: "Product",
    entityId: id,
    details: { name: existing.name },
  });
  return json(product);
});

export const DELETE = apiHandler(async (_request: Request, { params }: Params) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const { id } = await params;

  const existing = await prisma.product.findFirst({
    where: { id, restaurantId: user.restaurantId },
  });
  if (!existing) return errorJson("Produit introuvable", 404);

  await prisma.product.delete({ where: { id } });
  await logActivity({
    action: "product.delete",
    restaurantId: user.restaurantId,
    userId: user.id,
    entity: "Product",
    entityId: id,
    details: { name: existing.name },
  });
  return json({ ok: true });
});
