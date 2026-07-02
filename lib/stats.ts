import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";

/** Statuts comptabilisés dans le chiffre d'affaires. */
const REVENUE_STATUSES = ["ACCEPTED", "PREPARING", "READY", "SERVED", "COMPLETED"] as const;

type Period = { from: Date; to?: Date };

async function revenueAndCount(restaurantId: string, period: Period) {
  const result = await prisma.order.aggregate({
    where: {
      restaurantId,
      status: { in: [...REVENUE_STATUSES] },
      createdAt: { gte: period.from, ...(period.to ? { lt: period.to } : {}) },
    },
    _sum: { totalAmount: true },
    _count: true,
  });
  return { revenue: Number(result._sum.totalAmount ?? 0), count: result._count };
}

function evolution(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** KPI temps réel du tableau de bord. */
export async function getOverviewStats(restaurantId: string) {
  const now = new Date();
  const today = startOfDay(now);
  const week = startOfWeek(now, { weekStartsOn: 1 });
  const month = startOfMonth(now);

  const [
    dayCur, dayPrev,
    weekCur, weekPrev,
    monthCur, monthPrev,
    statusCounts,
    monthOrders,
    prepTimes,
  ] = await Promise.all([
    revenueAndCount(restaurantId, { from: today }),
    revenueAndCount(restaurantId, { from: subDays(today, 1), to: today }),
    revenueAndCount(restaurantId, { from: week }),
    revenueAndCount(restaurantId, { from: subWeeks(week, 1), to: week }),
    revenueAndCount(restaurantId, { from: month }),
    revenueAndCount(restaurantId, { from: subMonths(month, 1), to: month }),
    prisma.order.groupBy({
      by: ["status"],
      where: { restaurantId, createdAt: { gte: today } },
      _count: true,
    }),
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: month } },
      select: { status: true, totalAmount: true, customerName: true },
    }),
    prisma.$queryRaw<{ avg_minutes: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("readyAt" - "createdAt")) / 60) AS avg_minutes
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId}
        AND "readyAt" IS NOT NULL
        AND "createdAt" >= ${month}
    `,
  ]);

  const productsSold = await prisma.orderItem.aggregate({
    where: {
      order: { restaurantId, createdAt: { gte: month }, status: { in: [...REVENUE_STATUSES] } },
    },
    _sum: { quantity: true },
  });

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const cancelled = monthOrders.filter((o) => o.status === "CANCELLED").length;
  const validOrders = monthOrders.filter((o) => o.status !== "CANCELLED");

  return {
    revenue: {
      today: { value: dayCur.revenue, evolution: evolution(dayCur.revenue, dayPrev.revenue) },
      week: { value: weekCur.revenue, evolution: evolution(weekCur.revenue, weekPrev.revenue) },
      month: { value: monthCur.revenue, evolution: evolution(monthCur.revenue, monthPrev.revenue) },
    },
    orders: {
      today: { value: dayCur.count, evolution: evolution(dayCur.count, dayPrev.count) },
      month: { value: monthCur.count, evolution: evolution(monthCur.count, monthPrev.count) },
      pending: byStatus["NEW"] ?? 0,
      preparing: (byStatus["ACCEPTED"] ?? 0) + (byStatus["PREPARING"] ?? 0),
      ready: byStatus["READY"] ?? 0,
      completed: (byStatus["SERVED"] ?? 0) + (byStatus["COMPLETED"] ?? 0),
      cancelled: byStatus["CANCELLED"] ?? 0,
    },
    averageBasket: monthCur.count > 0 ? Math.round((monthCur.revenue / monthCur.count) * 100) / 100 : 0,
    customers: validOrders.length,
    productsSold: productsSold._sum.quantity ?? 0,
    averagePrepMinutes: prepTimes[0]?.avg_minutes ? Math.round(Number(prepTimes[0].avg_minutes)) : null,
    cancellationRate:
      monthOrders.length > 0 ? Math.round((cancelled / monthOrders.length) * 1000) / 10 : 0,
  };
}

/** Séries pour les graphiques du tableau de bord et de la page KPI. */
export async function getChartData(restaurantId: string, days = 30) {
  const from = startOfDay(subDays(new Date(), days - 1));

  const [revenueByDay, ordersByHour, byCategory, byType, heatmap] = await Promise.all([
    prisma.$queryRaw<{ day: Date; revenue: number; orders: number }[]>`
      SELECT date_trunc('day', "createdAt") AS day,
             COALESCE(SUM("totalAmount"), 0)::float AS revenue,
             COUNT(*)::int AS orders
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId}
        AND "createdAt" >= ${from}
        AND status != 'CANCELLED'
      GROUP BY 1 ORDER BY 1
    `,
    prisma.$queryRaw<{ hour: number; orders: number; revenue: number }[]>`
      SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour,
             COUNT(*)::int AS orders,
             COALESCE(SUM("totalAmount"), 0)::float AS revenue
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId}
        AND "createdAt" >= ${from}
        AND status != 'CANCELLED'
      GROUP BY 1 ORDER BY 1
    `,
    prisma.$queryRaw<{ category: string; revenue: number; quantity: number }[]>`
      SELECT COALESCE(c.name, 'Autre') AS category,
             COALESCE(SUM(oi."totalPrice"), 0)::float AS revenue,
             COALESCE(SUM(oi.quantity), 0)::int AS quantity
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      LEFT JOIN "Product" p ON p.id = oi."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE o."restaurantId" = ${restaurantId}
        AND o."createdAt" >= ${from}
        AND o.status != 'CANCELLED'
      GROUP BY 1 ORDER BY 2 DESC
    `,
    prisma.order.groupBy({
      by: ["type"],
      where: { restaurantId, createdAt: { gte: from }, status: { not: "CANCELLED" } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.$queryRaw<{ dow: number; hour: number; orders: number }[]>`
      SELECT EXTRACT(ISODOW FROM "createdAt")::int AS dow,
             EXTRACT(HOUR FROM "createdAt")::int AS hour,
             COUNT(*)::int AS orders
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId}
        AND "createdAt" >= ${from}
        AND status != 'CANCELLED'
      GROUP BY 1, 2
    `,
  ]);

  return {
    revenueByDay: revenueByDay.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      revenue: r.revenue,
      orders: r.orders,
    })),
    ordersByHour,
    byCategory,
    byType: byType.map((t) => ({
      type: t.type,
      orders: t._count,
      revenue: Number(t._sum.totalAmount ?? 0),
    })),
    heatmap,
  };
}

/** Classement des produits sur une période, avec évolution vs période précédente. */
export async function getProductRanking(restaurantId: string, from: Date, to: Date) {
  const spanMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - spanMs);

  const rankQuery = (start: Date, end: Date) => prisma.$queryRaw<
    { productId: string | null; name: string; quantity: number; revenue: number }[]
  >`
    SELECT oi."productId" AS "productId",
           oi."productName" AS name,
           SUM(oi.quantity)::int AS quantity,
           SUM(oi."totalPrice")::float AS revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."restaurantId" = ${restaurantId}
      AND o."createdAt" >= ${start} AND o."createdAt" < ${end}
      AND o.status != 'CANCELLED'
    GROUP BY 1, 2
    ORDER BY 3 DESC
  `;

  const [current, previous, allProducts] = await Promise.all([
    rankQuery(from, to),
    rankQuery(prevFrom, from),
    prisma.product.findMany({
      where: { restaurantId },
      select: { id: true, name: true, price: true, isAvailable: true },
    }),
  ]);

  const prevByProduct = new Map(previous.map((p) => [p.productId ?? p.name, p.quantity]));
  const ranked = current.map((p, index) => ({
    rank: index + 1,
    productId: p.productId,
    name: p.name,
    quantity: p.quantity,
    revenue: Math.round(p.revenue * 100) / 100,
    evolution: evolution(p.quantity, prevByProduct.get(p.productId ?? p.name) ?? 0),
  }));

  const orderedIds = new Set(current.map((p) => p.productId).filter(Boolean));
  const everOrdered = new Set(
    (
      await prisma.orderItem.findMany({
        where: { order: { restaurantId }, productId: { not: null } },
        select: { productId: true },
        distinct: ["productId"],
      })
    ).map((i) => i.productId)
  );

  return {
    top: ranked,
    least: [...ranked].sort((a, b) => a.quantity - b.quantity).slice(0, 10),
    mostProfitable: [...ranked].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    unavailable: allProducts
      .filter((p) => !p.isAvailable)
      .map((p) => ({ productId: p.id, name: p.name, price: Number(p.price) })),
    neverOrdered: allProducts
      .filter((p) => !everOrdered.has(p.id) && !orderedIds.has(p.id))
      .map((p) => ({ productId: p.id, name: p.name, price: Number(p.price) })),
  };
}
