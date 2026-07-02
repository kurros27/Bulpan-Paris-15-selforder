import ExcelJS from "exceljs";
import { apiHandler } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";
import { addMenuSheet } from "@/lib/excel";

/** Export de la carte seule, au format attendu par l'import. */
export const GET = apiHandler(async () => {
  const user = await requireRestaurantUser();
  const workbook = new ExcelJS.Workbook();
  await addMenuSheet(workbook, user.restaurantId);
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="carte.xlsx"`,
    },
  });
});
