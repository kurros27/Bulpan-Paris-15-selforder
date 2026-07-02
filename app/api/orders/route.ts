import { prisma } from "@/lib/prisma";
import { apiHandler, json } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { OrderStatus } from "@/lib/generated/prisma/enums";

const STATUSES = ["NEW", "ACCEPTED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"];

/**
 * Liste des commandes avec filtres : ?status=&from=&to=&table=&q=&active=1&page=&pageSize=
 * `active=1` limite aux commandes en cours (écran de gestion temps réel).
 */
export const GET = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const table = url.searchParams.get("table");
  const q = url.searchParams.get("q");
  const active = url.searchParams.get("active");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25);

  const where: Prisma.OrderWhereInput = { restaurantId: user.restaurantId };
  if (active) where.status = { in: ["NEW", "ACCEPTED", "PREPARING", "READY"] };
  else if (status && STATUSES.includes(status)) where.status = status as OrderStatus;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
  }
  if (table) where.tableName = { contains: table, mode: "insensitive" };
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { tableName: { contains: q, mode: "insensitive" } },
      { items: { some: { productName: { contains: q, mode: "insensitive" } } } },
      ...(Number.isInteger(Number(q)) && q !== "" ? [{ number: Number(q) }] : []),
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: true, table: { select: { name: true, zone: true } } },
      skip: active ? 0 : (page - 1) * pageSize,
      take: active ? 200 : pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return json({ orders, total, page, pageSize });
});
