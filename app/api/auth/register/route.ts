import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { logActivity, requestIp } from "@/lib/audit";

export const POST = apiHandler(async (request: Request) => {
  const data = await parseBody(request, registerSchema);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return errorJson("Un compte existe déjà avec cet e-mail", 409);

  // Slug unique dérivé du nom du restaurant
  const base = slugify(data.restaurantName) || "restaurant";
  let slug = base;
  for (let i = 2; await prisma.restaurant.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      name: data.restaurantName,
      slug,
      email: data.email,
      users: {
        create: {
          email: data.email,
          name: data.name,
          passwordHash: await hashPassword(data.password),
          role: "ADMIN",
        },
      },
      qrCodes: { create: { label: "QR principal" } },
    },
    include: { users: true },
  });

  const user = restaurant.users[0];
  await setSessionCookie({ userId: user.id, role: user.role, restaurantId: restaurant.id });
  await logActivity({
    action: "auth.register",
    restaurantId: restaurant.id,
    userId: user.id,
    ip: requestIp(request),
  });

  return json({ restaurant: { id: restaurant.id, slug: restaurant.slug, name: restaurant.name } }, 201);
});
