import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { logActivity, requestIp } from "@/lib/audit";

export const POST = apiHandler(async (request: Request) => {
  const { email, password } = await parseBody(request, loginSchema);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { restaurant: { select: { status: true } } },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return errorJson("E-mail ou mot de passe incorrect", 401);
  }
  if (!user.isActive) return errorJson("Ce compte a été désactivé", 403);
  if (user.role !== "SUPER_ADMIN" && user.restaurant?.status === "SUSPENDED") {
    return errorJson("Ce restaurant est suspendu. Contactez le support.", 403);
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSessionCookie({ userId: user.id, role: user.role, restaurantId: user.restaurantId });
  await logActivity({
    action: "auth.login",
    restaurantId: user.restaurantId,
    userId: user.id,
    ip: requestIp(request),
  });

  return json({ role: user.role });
});
