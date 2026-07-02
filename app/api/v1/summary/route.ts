import { apiHandler, json } from "@/lib/api";
import { requireApiKey } from "@/lib/apikey-auth";
import { getOverviewStats, getChartData } from "@/lib/stats";

/**
 * API d'intégration — synthèse KPI + séries journalières.
 * Pensée pour alimenter Power BI, Looker Studio, Google Sheets ou un
 * tableau de bord Excel via Power Query (?days=30).
 */
export const GET = apiHandler(async (request: Request) => {
  const apiKey = await requireApiKey(request);
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") ?? "30", 10) || 30));

  const [kpi, charts] = await Promise.all([
    getOverviewStats(apiKey.restaurantId),
    getChartData(apiKey.restaurantId, days),
  ]);

  return json({
    restaurant: { slug: apiKey.restaurant.slug, name: apiKey.restaurant.name, currency: apiKey.restaurant.currency },
    kpi,
    series: charts,
  });
});
