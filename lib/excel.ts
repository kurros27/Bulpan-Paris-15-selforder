import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getOverviewStats, getProductRanking, getChartData } from "@/lib/stats";
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "@/lib/utils";
import { subDays, startOfDay } from "date-fns";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E293B" },
};
const ACCENT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE11D48" },
};

function styleHeader(sheet: ExcelJS.Worksheet, fill: ExcelJS.Fill = HEADER_FILL) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = fill;
  header.height = 22;
  header.alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  if (sheet.columnCount > 0 && sheet.rowCount > 1) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columnCount },
    };
  }
}

function addTotalRow(sheet: ExcelJS.Worksheet, values: Record<string, number | string>) {
  const row = sheet.addRow(values);
  row.font = { bold: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  return row;
}

const EURO_FMT = '#,##0.00" €"';

/** Feuille "Carte" — format identique à celui attendu à l'import. */
export async function addMenuSheet(workbook: ExcelJS.Workbook, restaurantId: string) {
  const sheet = workbook.addWorksheet("Carte");
  sheet.columns = [
    { header: "Catégorie", key: "category", width: 22 },
    { header: "Nom", key: "name", width: 30 },
    { header: "Description", key: "description", width: 50 },
    { header: "Prix", key: "price", width: 12, style: { numFmt: EURO_FMT } },
    { header: "Disponibilité", key: "available", width: 14 },
    { header: "Allergènes", key: "allergens", width: 30 },
    { header: "Temps de préparation", key: "prepTime", width: 20 },
    { header: "URL de la photo", key: "imageUrl", width: 40 },
  ];

  const categories = await prisma.category.findMany({
    where: { restaurantId },
    orderBy: { sortOrder: "asc" },
    include: { products: { orderBy: { sortOrder: "asc" } } },
  });

  for (const category of categories) {
    for (const product of category.products) {
      sheet.addRow({
        category: category.name,
        name: product.name,
        description: product.description ?? "",
        price: Number(product.price),
        available: product.isAvailable ? "Oui" : "Non",
        allergens: product.allergens.join(", "),
        prepTime: product.prepTimeMinutes,
        imageUrl: product.imageUrl ?? "",
      });
    }
  }
  styleHeader(sheet, ACCENT_FILL);
  return sheet;
}

/** Export complet multi-feuilles : commandes, produits, carte, CA, KPI, meilleures ventes, statistiques. */
export async function buildFullExport(restaurantId: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QRServe";
  workbook.created = new Date();

  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
  const now = new Date();
  const from = startOfDay(subDays(now, 29));

  // ── Commandes ──
  const ordersSheet = workbook.addWorksheet("Commandes");
  ordersSheet.columns = [
    { header: "N°", key: "number", width: 8 },
    { header: "Date", key: "date", width: 18 },
    { header: "Client", key: "customer", width: 20 },
    { header: "Table", key: "table", width: 12 },
    { header: "Type", key: "type", width: 12 },
    { header: "Statut", key: "status", width: 15 },
    { header: "Articles", key: "items", width: 60 },
    { header: "Total", key: "total", width: 12, style: { numFmt: EURO_FMT } },
  ];
  const orders = await prisma.order.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 2000,
    include: { items: true },
  });
  for (const order of orders) {
    ordersSheet.addRow({
      number: order.number,
      date: order.createdAt,
      customer: order.customerName ?? "—",
      table: order.tableName ?? "—",
      type: ORDER_TYPE_LABELS[order.type],
      status: ORDER_STATUS_LABELS[order.status],
      items: order.items.map((i) => `${i.quantity}× ${i.productName}`).join(", "),
      total: Number(order.totalAmount),
    });
  }
  styleHeader(ordersSheet);
  const validTotal = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);
  addTotalRow(ordersSheet, { number: "TOTAL", total: Math.round(validTotal * 100) / 100 });

  // ── Produits ──
  const productsSheet = workbook.addWorksheet("Produits");
  productsSheet.columns = [
    { header: "Produit", key: "name", width: 30 },
    { header: "Catégorie", key: "category", width: 22 },
    { header: "Prix", key: "price", width: 12, style: { numFmt: EURO_FMT } },
    { header: "TVA (%)", key: "vat", width: 10 },
    { header: "Disponible", key: "available", width: 12 },
    { header: "Étiquettes", key: "tags", width: 25 },
    { header: "Allergènes", key: "allergens", width: 30 },
  ];
  const products = await prisma.product.findMany({
    where: { restaurantId },
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  for (const p of products) {
    productsSheet.addRow({
      name: p.name,
      category: p.category.name,
      price: Number(p.price),
      vat: Number(p.vatRate),
      available: p.isAvailable ? "Oui" : "Non",
      tags: p.tags.join(", "),
      allergens: p.allergens.join(", "),
    });
  }
  styleHeader(productsSheet);

  // ── Carte (format import) ──
  await addMenuSheet(workbook, restaurantId);

  // ── Chiffre d'affaires ──
  const charts = await getChartData(restaurantId, 30);
  const revenueSheet = workbook.addWorksheet("Chiffre d'affaires");
  revenueSheet.columns = [
    { header: "Jour", key: "day", width: 15 },
    { header: "Chiffre d'affaires", key: "revenue", width: 18, style: { numFmt: EURO_FMT } },
    { header: "Commandes", key: "orders", width: 12 },
  ];
  for (const row of charts.revenueByDay) revenueSheet.addRow(row);
  styleHeader(revenueSheet);
  addTotalRow(revenueSheet, {
    day: "TOTAL",
    revenue: Math.round(charts.revenueByDay.reduce((s, r) => s + r.revenue, 0) * 100) / 100,
    orders: charts.revenueByDay.reduce((s, r) => s + r.orders, 0),
  });

  // ── KPI ──
  const stats = await getOverviewStats(restaurantId);
  const kpiSheet = workbook.addWorksheet("KPI");
  kpiSheet.columns = [
    { header: "Indicateur", key: "label", width: 35 },
    { header: "Valeur", key: "value", width: 20 },
  ];
  const kpiRows: [string, string | number][] = [
    ["Chiffre d'affaires du jour", stats.revenue.today.value],
    ["Chiffre d'affaires de la semaine", stats.revenue.week.value],
    ["Chiffre d'affaires du mois", stats.revenue.month.value],
    ["Commandes du mois", stats.orders.month.value],
    ["Panier moyen", stats.averageBasket],
    ["Clients (mois)", stats.customers],
    ["Produits vendus (mois)", stats.productsSold],
    ["Temps moyen de préparation (min)", stats.averagePrepMinutes ?? "—"],
    ["Taux d'annulation (%)", stats.cancellationRate],
  ];
  for (const [label, value] of kpiRows) kpiSheet.addRow({ label, value });
  styleHeader(kpiSheet);

  // ── Meilleures ventes ──
  const ranking = await getProductRanking(restaurantId, from, now);
  const topSheet = workbook.addWorksheet("Meilleures ventes");
  topSheet.columns = [
    { header: "Rang", key: "rank", width: 8 },
    { header: "Produit", key: "name", width: 30 },
    { header: "Quantité vendue", key: "quantity", width: 16 },
    { header: "Chiffre d'affaires", key: "revenue", width: 18, style: { numFmt: EURO_FMT } },
    { header: "Évolution (%)", key: "evolution", width: 14 },
  ];
  for (const row of ranking.top) {
    topSheet.addRow({ ...row, evolution: row.evolution ?? "—" });
  }
  styleHeader(topSheet);

  // ── Statistiques ──
  const statsSheet = workbook.addWorksheet("Statistiques");
  statsSheet.columns = [
    { header: "Catégorie", key: "category", width: 25 },
    { header: "Quantité", key: "quantity", width: 12 },
    { header: "Chiffre d'affaires", key: "revenue", width: 18, style: { numFmt: EURO_FMT } },
  ];
  for (const row of charts.byCategory) statsSheet.addRow(row);
  styleHeader(statsSheet);

  return { workbook, restaurant };
}

const AVAILABLE_VALUES = new Set(["oui", "yes", "true", "1", "disponible"]);

/** Import de la carte depuis un fichier .xlsx (crée catégories et produits). */
export async function importMenuFromBuffer(restaurantId: string, buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Carte") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("Aucune feuille trouvée dans le fichier");

  // Repère les colonnes à partir des en-têtes
  const headerRow = sheet.getRow(1);
  const columnIndex: Record<string, number> = {};
  headerRow.eachCell((cell, col) => {
    const value = String(cell.value ?? "").toLowerCase().trim();
    if (value.startsWith("catégorie") || value.startsWith("categorie")) columnIndex.category = col;
    else if (value === "nom") columnIndex.name = col;
    else if (value.startsWith("description")) columnIndex.description = col;
    else if (value.startsWith("prix")) columnIndex.price = col;
    else if (value.startsWith("disponib")) columnIndex.available = col;
    else if (value.startsWith("allerg")) columnIndex.allergens = col;
    else if (value.startsWith("temps")) columnIndex.prepTime = col;
    else if (value.includes("photo") || value.includes("image")) columnIndex.imageUrl = col;
  });
  if (!columnIndex.category || !columnIndex.name || !columnIndex.price) {
    throw new Error("Colonnes requises manquantes : Catégorie, Nom, Prix");
  }

  const cellText = (row: ExcelJS.Row, col?: number) => {
    if (!col) return "";
    const value = row.getCell(col).value;
    if (value === null || value === undefined) return "";
    if (typeof value === "object" && "text" in value) return String(value.text);
    if (typeof value === "object" && "result" in value) return String(value.result ?? "");
    return String(value);
  };

  const rows: {
    category: string;
    name: string;
    description: string;
    price: number;
    available: boolean;
    allergens: string[];
    prepTime: number;
    imageUrl: string | null;
  }[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const category = cellText(row, columnIndex.category).trim();
    const name = cellText(row, columnIndex.name).trim();
    const price = parseFloat(cellText(row, columnIndex.price).replace(",", ".").replace(/[^\d.-]/g, ""));
    if (!category || !name || Number.isNaN(price)) return;
    const availableRaw = cellText(row, columnIndex.available).toLowerCase().trim();
    const imageUrl = cellText(row, columnIndex.imageUrl).trim();
    rows.push({
      category,
      name,
      description: cellText(row, columnIndex.description).trim(),
      price,
      available: availableRaw === "" || AVAILABLE_VALUES.has(availableRaw),
      allergens: cellText(row, columnIndex.allergens)
        .split(/[,;]/)
        .map((a) => a.trim())
        .filter(Boolean),
      prepTime: parseInt(cellText(row, columnIndex.prepTime), 10) || 10,
      imageUrl: /^https?:\/\//.test(imageUrl) ? imageUrl : null,
    });
  });

  if (rows.length === 0) throw new Error("Aucune ligne de produit valide trouvée");

  let createdCategories = 0;
  let createdProducts = 0;
  let updatedProducts = 0;

  await prisma.$transaction(async (tx) => {
    const existingCategories = await tx.category.findMany({ where: { restaurantId } });
    const categoryByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
    let categoryOrder = existingCategories.length;

    for (const row of rows) {
      let category = categoryByName.get(row.category.toLowerCase());
      if (!category) {
        category = await tx.category.create({
          data: { restaurantId, name: row.category, sortOrder: categoryOrder++ },
        });
        categoryByName.set(row.category.toLowerCase(), category);
        createdCategories++;
      }

      const existing = await tx.product.findFirst({
        where: { restaurantId, categoryId: category.id, name: row.name },
      });
      const data = {
        description: row.description || null,
        price: row.price,
        isAvailable: row.available,
        allergens: row.allergens,
        prepTimeMinutes: row.prepTime,
        imageUrl: row.imageUrl,
      };
      if (existing) {
        await tx.product.update({ where: { id: existing.id }, data });
        updatedProducts++;
      } else {
        const count = await tx.product.count({ where: { categoryId: category.id } });
        await tx.product.create({
          data: { ...data, restaurantId, categoryId: category.id, name: row.name, sortOrder: count },
        });
        createdProducts++;
      }
    }
  });

  return { createdCategories, createdProducts, updatedProducts, totalRows: rows.length };
}
