import { apiHandler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  return json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurant: user.restaurant
      ? { id: user.restaurant.id, slug: user.restaurant.slug, name: user.restaurant.name }
      : null,
  });
});
