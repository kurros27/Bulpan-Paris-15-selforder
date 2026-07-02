import { apiHandler, json } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";
import { getProductRanking } from "@/lib/stats";
import { startOfDay, startOfWeek, startOfMonth, startOfYear } from "date-fns";

/** Classement produits : ?period=today|week|month|year ou ?from=&to= */
export const GET = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser();
  const url = new URL(request.url);
  const now = new Date();
  const period = url.searchParams.get("period") ?? "month";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  let from: Date;
  let to = now;
  if (fromParam) {
    from = new Date(fromParam);
    if (toParam) to = new Date(`${toParam}T23:59:59.999Z`);
  } else {
    switch (period) {
      case "today":
        from = startOfDay(now);
        break;
      case "week":
        from = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case "year":
        from = startOfYear(now);
        break;
      default:
        from = startOfMonth(now);
    }
  }

  return json(await getProductRanking(user.restaurantId, from, to));
});
