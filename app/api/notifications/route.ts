import { prisma } from "@/lib/prisma";
import { apiHandler, json } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";

export const GET = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser();
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "1";

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { restaurantId: user.restaurantId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { restaurantId: user.restaurantId, isRead: false } }),
  ]);
  return json({ notifications, unreadCount });
});

/** Marque toutes les notifications comme lues. */
export const PATCH = apiHandler(async () => {
  const user = await requireRestaurantUser();
  await prisma.notification.updateMany({
    where: { restaurantId: user.restaurantId, isRead: false },
    data: { isRead: true },
  });
  return json({ ok: true });
});
