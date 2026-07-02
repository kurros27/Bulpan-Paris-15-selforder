import { apiHandler, json } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";
import { getOverviewStats } from "@/lib/stats";

export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  return json(await getOverviewStats(user.restaurantId));
});
