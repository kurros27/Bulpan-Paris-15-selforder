import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody, serialize } from "@/lib/api";
import { publicOrderSchema } from "@/lib/validators";
import { publishToRestaurant } from "@/lib/events";
import { logActivity, requestIp } from "@/lib/audit";

export const POST = apiHandler(async (request: Request) => {
  const data = await parseBody(request, publicOrderSchema);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: data.restaurantSlug },
    select: { id: true, status: true },
  });
  if (!restaurant || restaurant.status === "SUSPENDED") {
    return errorJson("Restaurant introuvable", 404);
  }

  // Recharge les produits et options depuis la base : les prix sont
  // TOUJOURS recalculés côté serveur, jamais pris du client.
  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, restaurantId: restaurant.id },
    include: { optionGroups: { include: { choices: true } } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  type ItemInput = {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    vatRate: number;
    comment: string | null;
    options: { group: string; choice: string; priceDelta: number }[];
  };
  const items: ItemInput[] = [];

  for (const item of data.items) {
    const product = productById.get(item.productId);
    if (!product) return errorJson("Produit introuvable", 400);
    if (!product.isAvailable) {
      return errorJson(`« ${product.name} » n'est plus disponible`, 409);
    }

    const choiceById = new Map(
      product.optionGroups.flatMap((g) => g.choices.map((c) => [c.id, { group: g, choice: c }]))
    );
    const options: ItemInput["options"] = [];
    let optionsTotal = 0;
    const selectedByGroup = new Map<string, number>();

    for (const choiceId of item.choiceIds) {
      const found = choiceById.get(choiceId);
      if (!found || !found.choice.isAvailable) return errorJson("Option invalide", 400);
      options.push({
        group: found.group.name,
        choice: found.choice.name,
        priceDelta: Number(found.choice.priceDelta),
      });
      optionsTotal += Number(found.choice.priceDelta);
      selectedByGroup.set(found.group.id, (selectedByGroup.get(found.group.id) ?? 0) + 1);
    }

    // Contraintes min/max des groupes d'options
    for (const group of product.optionGroups) {
      const selected = selectedByGroup.get(group.id) ?? 0;
      const min = group.isRequired ? Math.max(group.minSelect, 1) : group.minSelect;
      if (selected < min) {
        return errorJson(`« ${group.name} » : sélection requise pour ${product.name}`, 422);
      }
      if (group.maxSelect > 0 && selected > group.maxSelect) {
        return errorJson(`« ${group.name} » : trop d'options sélectionnées`, 422);
      }
    }

    const unitPrice = Number(product.price) + optionsTotal;
    items.push({
      productId: product.id,
      productName: product.name,
      unitPrice: Math.round(unitPrice * 100) / 100,
      quantity: item.quantity,
      totalPrice: Math.round(unitPrice * item.quantity * 100) / 100,
      vatRate: Number(product.vatRate),
      comment: item.comment ?? null,
      options,
    });
  }

  const totalAmount = Math.round(items.reduce((sum, i) => sum + i.totalPrice, 0) * 100) / 100;

  // Rattache la table si elle existe (créée à la volée sinon, snapshot du nom)
  let tableId: string | null = null;
  if (data.type === "DINE_IN" && data.tableName) {
    const table = await prisma.table.findFirst({
      where: { restaurantId: restaurant.id, name: { equals: data.tableName, mode: "insensitive" } },
    });
    tableId = table?.id ?? null;
  }

  const order = await prisma.$transaction(async (tx) => {
    const { orderCounter } = await tx.restaurant.update({
      where: { id: restaurant.id },
      data: { orderCounter: { increment: 1 } },
      select: { orderCounter: true },
    });
    return tx.order.create({
      data: {
        restaurantId: restaurant.id,
        number: orderCounter,
        customerName: data.customerName || null,
        type: data.type,
        tableId,
        tableName: data.type === "DINE_IN" ? data.tableName || null : null,
        note: data.note || null,
        totalAmount,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            totalPrice: i.totalPrice,
            vatRate: i.vatRate,
            comment: i.comment,
            options: i.options as never,
          })),
        },
      },
      include: { items: true },
    });
  });

  await prisma.notification.create({
    data: {
      restaurantId: restaurant.id,
      type: "NEW_ORDER",
      title: `Nouvelle commande #${order.number}`,
      body: `${items.reduce((s, i) => s + i.quantity, 0)} article(s) — ${totalAmount.toFixed(2)} €`,
    },
  });
  publishToRestaurant(restaurant.id, { kind: "order.created", order: serialize(order) });
  await logActivity({
    action: "order.create",
    restaurantId: restaurant.id,
    entity: "Order",
    entityId: order.id,
    details: { number: order.number, total: totalAmount },
    ip: requestIp(request),
  });

  return json({ id: order.id, number: order.number, status: order.status }, 201);
});
