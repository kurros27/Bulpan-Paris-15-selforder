import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { hashPassword, requireRestaurantUser } from "@/lib/auth";
import { teamMemberSchema } from "@/lib/validators";
import { logActivity } from "@/lib/audit";

export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  const members = await prisma.user.findMany({
    where: { restaurantId: user.restaurantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return json(members);
});

export const POST = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(["ADMIN"]);
  const data = await parseBody(request, teamMemberSchema);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return errorJson("Un compte existe déjà avec cet e-mail", 409);

  const member = await prisma.user.create({
    data: {
      restaurantId: user.restaurantId,
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: await hashPassword(data.password),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  await logActivity({
    action: "team.create",
    restaurantId: user.restaurantId,
    userId: user.id,
    entity: "User",
    entityId: member.id,
    details: { email: member.email, role: member.role },
  });
  return json(member, 201);
});
