import { prisma } from "@/lib/prisma";
import { apiHandler, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { reorderSchema } from "@/lib/validators";

export const POST = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const { ids } = await parseBody(request, reorderSchema);

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.product.updateMany({
        where: { id, restaurantId: user.restaurantId },
        data: { sortOrder: index },
      })
    )
  );
  return json({ ok: true });
});
