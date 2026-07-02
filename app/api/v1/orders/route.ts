import { prisma } from "@/lib/prisma";
import { apiHandler, json } from "@/lib/api";
import { requireApiKey } from "@/lib/apikey-auth";

/**
 * API d'intégration — commandes.
 * GET /api/v1/orders?from=&to=&status=&page=&pageSize=
 * Auth : Authorization: Bearer <clé d'API>
 */
export const GET = apiHandler(async (request: Request) => {
  const apiKey = await requireApiKey(request);
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.get("status");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(200, parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50);

  const where = {
    restaurantId: apiKey.restaurantId,
    ...(status ? { status: status as never } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return json({ data: orders, total, page, pageSize });
});
