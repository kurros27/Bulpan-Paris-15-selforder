import { prisma } from "@/lib/prisma";
import { apiHandler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = apiHandler(async (request: Request) => {
  await requireUser(["SUPER_ADMIN"]);
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      restaurant: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return json(users);
});
