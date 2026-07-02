import { apiHandler, errorJson, json } from "@/lib/api";
import { MANAGER_ROLES, requireRestaurantUser } from "@/lib/auth";
import { importMenuFromBuffer } from "@/lib/excel";
import { logActivity } from "@/lib/audit";

/** Import de la carte depuis un fichier .xlsx (multipart, champ "file"). */
export const POST = apiHandler(async (request: Request) => {
  const user = await requireRestaurantUser(MANAGER_ROLES);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return errorJson("Fichier manquant (champ « file »)", 400);
  }
  if (file.size > 5 * 1024 * 1024) return errorJson("Fichier trop volumineux (max 5 Mo)", 413);

  try {
    const result = await importMenuFromBuffer(user.restaurantId, await file.arrayBuffer());
    await logActivity({
      action: "menu.import",
      restaurantId: user.restaurantId,
      userId: user.id,
      details: result as unknown as Record<string, unknown>,
    });
    return json(result);
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Fichier illisible", 422);
  }
});
