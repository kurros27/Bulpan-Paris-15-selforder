import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { apiHandler, json, parseBody } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";
import { apiKeySchema } from "@/lib/validators";
import { logActivity } from "@/lib/audit";

export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser(["ADMIN"]);
  const keys = await prisma.apiKey.findMany({
    where: { restaurantId: user.restaurantId },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return json(keys);
});

/** Crée une clé d'API. La clé complète n'est renvoyée qu'une seule fois. */
export const POST = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(["ADMIN"]);
  const { name } = await parseBody(request, apiKeySchema);

  const rawKey = `qrs_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.create({
    data: {
      restaurantId: user.restaurantId,
      name,
      prefix: rawKey.slice(0, 12),
      keyHash,
    },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  await logActivity({
    action: "apikey.create",
    restaurantId: user.restaurantId,
    userId: user.id,
    entity: "ApiKey",
    entityId: apiKey.id,
  });
  return json({ ...apiKey, key: rawKey }, 201);
});
