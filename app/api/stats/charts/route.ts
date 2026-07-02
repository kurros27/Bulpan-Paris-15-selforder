import { apiHandler, json } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";
import { getChartData } from "@/lib/stats";

export const GET = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser();
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") ?? "30", 10) || 30));
  return json(await getChartData(user.restaurantId, days));
});
