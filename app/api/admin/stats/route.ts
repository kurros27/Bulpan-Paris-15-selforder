import { prisma } from "@/lib/prisma";
import { apiHandler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { startOfMonth, subDays, startOfDay } from "date-fns";

/** Statistiques globales de la plateforme (super admin). */
export const GET = apiHandler(async () => {
  await requireUser(["SUPER_ADMIN"]);
  const month = startOfMonth(new Date());
  const last30 = startOfDay(subDays(new Date(), 29));

  const [restaurants, activeRestaurants, users, ordersMonth, revenueMonth, plans, ordersByDay] =
    await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
      prisma.order.count({ where: { createdAt: { gte: month } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: month }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.restaurant.groupBy({ by: ["plan"], _count: true, _sum: { monthlyFee: true } }),
      prisma.$queryRaw<{ day: Date; orders: number; revenue: number }[]>`
        SELECT date_trunc('day', "createdAt") AS day,
               COUNT(*)::int AS orders,
               COALESCE(SUM("totalAmount"), 0)::float AS revenue
        FROM "Order"
        WHERE "createdAt" >= ${last30} AND status != 'CANCELLED'
        GROUP BY 1 ORDER BY 1
      `,
    ]);

  // Revenus de la plateforme = somme des abonnements mensuels actifs
  const platformRevenue = plans.reduce((sum, p) => sum + Number(p._sum.monthlyFee ?? 0), 0);

  return json({
    restaurants,
    activeRestaurants,
    suspendedRestaurants: restaurants - activeRestaurants,
    users,
    ordersMonth,
    gmvMonth: Number(revenueMonth._sum.totalAmount ?? 0),
    platformRevenue,
    plans: plans.map((p) => ({ plan: p.plan, count: p._count, fees: Number(p._sum.monthlyFee ?? 0) })),
    ordersByDay: ordersByDay.map((d) => ({
      day: d.day.toISOString().slice(0, 10),
      orders: d.orders,
      revenue: d.revenue,
    })),
  });
});
