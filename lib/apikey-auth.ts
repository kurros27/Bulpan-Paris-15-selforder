import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth";

/**
 * Authentifie une requête d'intégration externe (Zapier, Make, Power BI,
 * Google Sheets…) via l'en-tête `Authorization: Bearer qrs_…`.
 */
export async function requireApiKey(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(qrs_[a-f0-9]{48})$/i);
  if (!match) throw new AuthError("Clé d'API manquante ou mal formée", 401);

  const keyHash = crypto.createHash("sha256").update(match[1]).digest("hex");
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { restaurant: { select: { id: true, status: true, slug: true, name: true, currency: true } } },
  });
  if (!apiKey) throw new AuthError("Clé d'API invalide", 401);
  if (apiKey.restaurant.status === "SUSPENDED") throw new AuthError("Restaurant suspendu", 403);

  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return apiKey;
}
