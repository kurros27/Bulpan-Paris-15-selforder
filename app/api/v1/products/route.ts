import { prisma } from "@/lib/prisma";
import { apiHandler, json } from "@/lib/api";
import { requireApiKey } from "@/lib/apikey-auth";

/** API d'intégration — carte complète (catégories, produits, options). */
export const GET = apiHandler(async (request: Request) => {
  const apiKey = await requireApiKey(request);
  const categories = await prisma.category.findMany({
    where: { restaurantId: apiKey.restaurantId },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: { optionGroups: { include: { choices: true } } },
      },
    },
  });
  return json({ data: categories });
});
