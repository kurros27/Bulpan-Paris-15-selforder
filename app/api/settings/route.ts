import { prisma } from "@/lib/prisma";
import { apiHandler, json, parseBody } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { settingsSchema } from "@/lib/validators";
import { logActivity } from "@/lib/audit";

export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: user.restaurantId },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      address: true,
      phone: true,
      email: true,
      currency: true,
      defaultVat: true,
      primaryColor: true,
      darkMode: true,
      openingHours: true,
      socials: true,
      plan: true,
      status: true,
      createdAt: true,
    },
  });
  return json(restaurant);
});

export const PATCH = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);
  const data = await parseBody(request, settingsSchema);

  const restaurant = await prisma.restaurant.update({
    where: { id: user.restaurantId },
    data: {
      ...data,
      openingHours: data.openingHours === undefined ? undefined : (data.openingHours as never),
      socials: data.socials === undefined ? undefined : (data.socials as never),
    },
  });

  await logActivity({
    action: "settings.update",
    restaurantId: user.restaurantId,
    userId: user.id,
    details: { fields: Object.keys(data) },
  });
  return json(restaurant);
});
