import { prisma } from "@/lib/prisma";
import { apiHandler, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { getOverviewStats, getProductRanking } from "@/lib/stats";
import { z } from "zod";
import { startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths } from "date-fns";

export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  const reports = await prisma.report.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return json(reports);
});

const generateSchema = z.object({ frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]) });

/** Génère un rapport (KPI + meilleures ventes + tendances) pour la période écoulée. */
export const POST = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const { frequency } = await parseBody(request, generateSchema);

  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;
  if (frequency === "DAILY") {
    periodEnd = startOfDay(now);
    periodStart = subDays(periodEnd, 1);
  } else if (frequency === "WEEKLY") {
    periodEnd = startOfWeek(now, { weekStartsOn: 1 });
    periodStart = subWeeks(periodEnd, 1);
  } else {
    periodEnd = startOfMonth(now);
    periodStart = subMonths(periodEnd, 1);
  }

  const [stats, ranking, revenue] = await Promise.all([
    getOverviewStats(user.restaurantId),
    getProductRanking(user.restaurantId, periodStart, periodEnd),
    prisma.order.aggregate({
      where: {
        restaurantId: user.restaurantId,
        createdAt: { gte: periodStart, lt: periodEnd },
        status: { not: "CANCELLED" },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  const top = ranking.top.slice(0, 5);
  const least = ranking.least.slice(0, 5);
  const recommendations: string[] = [];
  if (least.length > 0) {
    recommendations.push(
      `Produits peu vendus à retravailler ou mettre en avant : ${least.map((p) => p.name).join(", ")}.`
    );
  }
  if (ranking.unavailable.length > 0) {
    recommendations.push(
      `${ranking.unavailable.length} produit(s) actuellement indisponible(s) : pensez à les réactiver ou à les retirer de la carte.`
    );
  }
  if (top.length > 0) {
    recommendations.push(`Votre meilleure vente est « ${top[0].name} » : envisagez une offre associée (menu, suggestion).`);
  }

  const report = await prisma.report.create({
    data: {
      restaurantId: user.restaurantId,
      frequency,
      periodStart,
      periodEnd,
      data: {
        revenue: Number(revenue._sum.totalAmount ?? 0),
        orders: revenue._count,
        averageBasket:
          revenue._count > 0
            ? Math.round((Number(revenue._sum.totalAmount ?? 0) / revenue._count) * 100) / 100
            : 0,
        kpi: stats,
        topProducts: top,
        leastProducts: least,
        recommendations,
      } as never,
    },
  });

  await prisma.notification.create({
    data: {
      restaurantId: user.restaurantId,
      type: "REPORT_READY",
      title: "Rapport disponible",
      body: `Votre rapport ${frequency === "DAILY" ? "quotidien" : frequency === "WEEKLY" ? "hebdomadaire" : "mensuel"} est prêt.`,
    },
  });

  return json(report, 201);
});
