import { apiHandler } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";
import { buildFullExport } from "@/lib/excel";
import { logActivity } from "@/lib/audit";

/** Export Excel complet (7 feuilles mises en forme). */
export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  const { workbook, restaurant } = await buildFullExport(user.restaurantId);
  const buffer = await workbook.xlsx.writeBuffer();

  await logActivity({
    action: "export.full",
    restaurantId: user.restaurantId,
    userId: user.id,
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="export-${restaurant.slug}-${date}.xlsx"`,
    },
  });
});
