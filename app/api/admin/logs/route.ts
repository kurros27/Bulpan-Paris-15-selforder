import { prisma } from "@/lib/prisma";
import { apiHandler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = apiHandler(async (request: Request) => {
  await requireUser(["SUPER_ADMIN"]);
  const url = new URL(request.url);
  const restaurantId = url.searchParams.get("restaurantId");
  const action = url.searchParams.get("action");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = 50;

  const where = {
    ...(restaurantId ? { restaurantId } : {}),
    ...(action ? { action: { contains: action } } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        restaurant: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return json({ logs, total, page, pageSize });
});
