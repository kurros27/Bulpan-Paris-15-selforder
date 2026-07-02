import { prisma } from "@/lib/prisma";
import { apiHandler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = apiHandler(async (request: Request) => {
  await requireUser(["SUPER_ADMIN"]);
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  const restaurants = await prisma.restaurant.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { orders: true, users: true, products: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // CA total par restaurant (hors annulées)
  const revenues = await prisma.order.groupBy({
    by: ["restaurantId"],
    where: { status: { not: "CANCELLED" } },
    _sum: { totalAmount: true },
  });
  const revenueByRestaurant = new Map(revenues.map((r) => [r.restaurantId, Number(r._sum.totalAmount ?? 0)]));

  return json(
    restaurants.map((r) => ({
      ...r,
      totalRevenue: revenueByRestaurant.get(r.id) ?? 0,
    }))
  );
});
