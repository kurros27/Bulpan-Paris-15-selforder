/**
 * Seed de démonstration :
 * - un super administrateur (admin@qrserve.fr / admin1234)
 * - le restaurant « Bulpan Paris 15 » (demo@bulpan.fr / demo1234)
 * - une carte coréenne complète avec options et suppléments
 * - 60 jours de commandes réalistes pour alimenter les statistiques
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const MENU: {
  category: string;
  description?: string;
  products: {
    name: string;
    description: string;
    price: number;
    prepTime?: number;
    tags?: string[];
    allergens?: string[];
    options?: {
      name: string;
      required?: boolean;
      max?: number;
      choices: [string, number][];
    }[];
  }[];
}[] = [
  {
    category: "Entrées",
    description: "Pour bien commencer",
    products: [
      {
        name: "Kimchi maison",
        description: "Chou fermenté épicé, recette traditionnelle",
        price: 5.5,
        tags: ["Épicé", "Vegan"],
        prepTime: 5,
      },
      {
        name: "Mandu (raviolis coréens)",
        description: "6 raviolis vapeur ou frits, porc et légumes",
        price: 8.9,
        allergens: ["Gluten", "Soja"],
        options: [
          { name: "Cuisson", required: true, choices: [["Vapeur", 0], ["Frits", 0]] },
        ],
      },
      {
        name: "Pajeon",
        description: "Galette coréenne aux ciboules et fruits de mer",
        price: 12.5,
        allergens: ["Gluten", "Œufs", "Crustacés"],
        prepTime: 12,
      },
    ],
  },
  {
    category: "Plats",
    description: "Nos spécialités",
    products: [
      {
        name: "Bibimbap",
        description: "Riz, légumes sautés, bœuf mariné, œuf au plat, sauce gochujang",
        price: 15.9,
        tags: ["Populaire"],
        allergens: ["Œufs", "Soja", "Sésame"],
        prepTime: 15,
        options: [
          {
            name: "Base",
            required: true,
            choices: [["Bœuf", 0], ["Poulet", 0], ["Tofu (végétarien)", 0]],
          },
          {
            name: "Suppléments",
            max: 0,
            choices: [["Œuf supplémentaire", 1.5], ["Fromage", 2], ["Riz supplémentaire", 2.5]],
          },
        ],
      },
      {
        name: "Bulgogi",
        description: "Bœuf mariné grillé, oignons et sésame, servi avec riz",
        price: 17.5,
        tags: ["Populaire"],
        allergens: ["Soja", "Sésame"],
        prepTime: 18,
        options: [
          { name: "Accompagnement", required: true, choices: [["Riz blanc", 0], ["Riz sauté", 2]] },
        ],
      },
      {
        name: "Dakgangjeong",
        description: "Poulet frit croustillant sauce aigre-douce épicée",
        price: 14.9,
        tags: ["Épicé", "Nouveau"],
        allergens: ["Gluten", "Soja"],
        prepTime: 16,
        options: [
          {
            name: "Niveau de piment",
            required: true,
            choices: [["Doux", 0], ["Moyen", 0], ["Fort", 0]],
          },
        ],
      },
      {
        name: "Sundubu-jjigae",
        description: "Ragoût de tofu soyeux épicé aux fruits de mer",
        price: 16.5,
        tags: ["Épicé"],
        allergens: ["Crustacés", "Soja"],
        prepTime: 20,
      },
      {
        name: "Japchae végétarien",
        description: "Vermicelles de patate douce sautés aux légumes",
        price: 13.9,
        tags: ["Végétarien"],
        allergens: ["Soja", "Sésame"],
        prepTime: 14,
      },
    ],
  },
  {
    category: "Desserts",
    products: [
      {
        name: "Bingsu mangue",
        description: "Glace pilée au lait, mangue fraîche et lait concentré",
        price: 9.5,
        tags: ["Populaire"],
        allergens: ["Lait"],
        prepTime: 8,
      },
      {
        name: "Hotteok",
        description: "Crêpe fourrée sucrée à la cannelle et cacahuètes",
        price: 6.5,
        allergens: ["Gluten", "Arachides"],
        prepTime: 10,
      },
    ],
  },
  {
    category: "Boissons",
    products: [
      { name: "Thé au yuzu", description: "Chaud ou glacé", price: 4.5, prepTime: 3 },
      { name: "Soju", description: "Bouteille 360 ml, original ou aromatisé", price: 12, prepTime: 2,
        options: [
          { name: "Parfum", required: true, choices: [["Original", 0], ["Pêche", 0], ["Pamplemousse", 0]] },
        ],
      },
      { name: "Bière coréenne Cass", description: "33 cl", price: 5.5, prepTime: 2 },
      { name: "Citronnade maison", description: "Pressée minute", price: 4.9, prepTime: 4, tags: ["Vegan"] },
    ],
  },
];

async function main() {
  console.info("Seed : nettoyage…");
  await prisma.restaurant.deleteMany({ where: { slug: "bulpan-paris-15" } });
  await prisma.user.deleteMany({ where: { email: "admin@qrserve.fr" } });

  console.info("Seed : super administrateur…");
  await prisma.user.create({
    data: {
      email: "admin@qrserve.fr",
      name: "Super Admin",
      passwordHash: await bcrypt.hash("admin1234", 12),
      role: "SUPER_ADMIN",
    },
  });

  console.info("Seed : restaurant Bulpan Paris 15…");
  const restaurant = await prisma.restaurant.create({
    data: {
      slug: "bulpan-paris-15",
      name: "Bulpan Paris 15",
      description: "Cuisine coréenne authentique — grillades et plats mijotés",
      address: "12 rue du Commerce, 75015 Paris",
      phone: "01 45 67 89 10",
      email: "demo@bulpan.fr",
      currency: "EUR",
      primaryColor: "#E11D48",
      plan: "PRO",
      monthlyFee: 49,
      openingHours: {
        monday: "Fermé",
        tuesday: "11:30-14:30, 18:30-22:30",
        wednesday: "11:30-14:30, 18:30-22:30",
        thursday: "11:30-14:30, 18:30-22:30",
        friday: "11:30-14:30, 18:30-23:00",
        saturday: "12:00-15:00, 18:30-23:00",
        sunday: "12:00-15:00, 18:30-22:00",
      },
      socials: { instagram: "https://instagram.com/bulpan.paris15" },
      users: {
        create: [
          {
            email: "demo@bulpan.fr",
            name: "David Chae",
            passwordHash: await bcrypt.hash("demo1234", 12),
            role: "ADMIN",
          },
          {
            email: "manager@bulpan.fr",
            name: "Minji Park",
            passwordHash: await bcrypt.hash("demo1234", 12),
            role: "MANAGER",
          },
        ],
      },
    },
  });

  console.info("Seed : tables et QR Codes…");
  const tables = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.table.create({
        data: {
          restaurantId: restaurant.id,
          name: String(i + 1),
          zone: i < 7 ? "Salle" : "Terrasse",
        },
      })
    )
  );
  await prisma.qrCode.createMany({
    data: [
      { restaurantId: restaurant.id, label: "Salle" },
      { restaurantId: restaurant.id, label: "Terrasse" },
      ...tables.slice(0, 4).map((table) => ({
        restaurantId: restaurant.id,
        label: `Table ${table.name}`,
        tableId: table.id,
      })),
    ],
  });

  console.info("Seed : carte…");
  const productIds: { id: string; name: string; price: number; choices: { id: string; delta: number }[][] }[] = [];
  let categoryOrder = 0;
  for (const categoryDef of MENU) {
    const category = await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: categoryDef.category,
        description: categoryDef.description,
        sortOrder: categoryOrder++,
      },
    });
    let productOrder = 0;
    for (const productDef of categoryDef.products) {
      const product = await prisma.product.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: productDef.name,
          description: productDef.description,
          price: productDef.price,
          prepTimeMinutes: productDef.prepTime ?? 12,
          tags: productDef.tags ?? [],
          allergens: productDef.allergens ?? [],
          vatRate: 10,
          sortOrder: productOrder++,
          optionGroups: productDef.options
            ? {
                create: productDef.options.map((group, gi) => ({
                  name: group.name,
                  isRequired: group.required ?? false,
                  minSelect: group.required ? 1 : 0,
                  maxSelect: group.max ?? 1,
                  sortOrder: gi,
                  choices: {
                    create: group.choices.map(([name, delta], ci) => ({
                      name,
                      priceDelta: delta,
                      sortOrder: ci,
                    })),
                  },
                })),
              }
            : undefined,
        },
        include: { optionGroups: { include: { choices: true } } },
      });
      productIds.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        choices: product.optionGroups.map((g) =>
          g.choices.map((c) => ({ id: c.id, delta: Number(c.priceDelta) }))
        ),
      });
    }
  }

  console.info("Seed : 60 jours de commandes…");
  const FIRST_NAMES = [
    "Camille", "Lucas", "Emma", "Nathan", "Léa", "Hugo", "Chloé", "Louis",
    "Manon", "Jules", "Inès", "Tom", null, null, null,
  ];
  const now = new Date();
  let orderNumber = 0;

  for (let daysAgo = 60; daysAgo >= 0; daysAgo--) {
    const day = new Date(now);
    day.setDate(day.getDate() - daysAgo);
    const weekday = day.getDay();
    if (weekday === 1) continue; // fermé le lundi

    const base = weekday === 5 || weekday === 6 ? 14 : 8;
    const orderCount = base + Math.floor(Math.random() * 6);

    for (let i = 0; i < orderCount; i++) {
      // services du midi (12-14h) et du soir (19-22h)
      const lunch = Math.random() < 0.45;
      const hour = lunch ? 12 + Math.floor(Math.random() * 2) : 19 + Math.floor(Math.random() * 3);
      const createdAt = new Date(day);
      createdAt.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      if (createdAt > now) continue;

      const itemCount = 1 + Math.floor(Math.random() * 3);
      const items: {
        productId: string;
        productName: string;
        unitPrice: number;
        quantity: number;
        totalPrice: number;
        vatRate: number;
        options: { group: string; choice: string; priceDelta: number }[];
      }[] = [];
      for (let j = 0; j < itemCount; j++) {
        const product = productIds[Math.floor(Math.random() * productIds.length)];
        let delta = 0;
        for (const group of product.choices) {
          if (group.length > 0 && Math.random() < 0.7) {
            delta += group[Math.floor(Math.random() * group.length)].delta;
          }
        }
        const quantity = Math.random() < 0.8 ? 1 : 2;
        const unitPrice = Math.round((product.price + delta) * 100) / 100;
        items.push({
          productId: product.id,
          productName: product.name,
          unitPrice,
          quantity,
          totalPrice: Math.round(unitPrice * quantity * 100) / 100,
          vatRate: 10,
          options: [],
        });
      }
      const totalAmount = Math.round(items.reduce((s, i) => s + i.totalPrice, 0) * 100) / 100;

      const cancelled = Math.random() < 0.04;
      const isToday = daysAgo === 0;
      const dineIn = Math.random() < 0.75;
      const table = dineIn ? tables[Math.floor(Math.random() * tables.length)] : null;
      const acceptedAt = new Date(createdAt.getTime() + 2 * 60 * 1000);
      const readyAt = new Date(createdAt.getTime() + (10 + Math.random() * 15) * 60 * 1000);

      // les commandes du jour restent dans le flux « en cours »
      const status = cancelled
        ? "CANCELLED"
        : isToday && i >= orderCount - 3
          ? (["NEW", "PREPARING", "READY"] as const)[i % 3]
          : "COMPLETED";

      orderNumber++;
      await prisma.order.create({
        data: {
          restaurantId: restaurant.id,
          number: orderNumber,
          customerName: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
          type: dineIn ? "DINE_IN" : "TAKEAWAY",
          tableId: table?.id ?? null,
          tableName: table?.name ?? null,
          status,
          totalAmount,
          createdAt,
          acceptedAt: status !== "NEW" && !cancelled ? acceptedAt : null,
          readyAt: ["READY", "SERVED", "COMPLETED"].includes(status) ? readyAt : null,
          completedAt: status === "COMPLETED" ? new Date(readyAt.getTime() + 5 * 60 * 1000) : null,
          cancelledAt: cancelled ? acceptedAt : null,
          items: { create: items.map((i) => ({ ...i, options: i.options as never })) },
        },
      });
    }
  }

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { orderCounter: orderNumber },
  });

  console.info(`Seed terminé : ${orderNumber} commandes créées.`);
  console.info("Comptes de démo :");
  console.info("  Super admin   → admin@qrserve.fr / admin1234");
  console.info("  Restaurateur  → demo@bulpan.fr / demo1234");
  console.info("  Manager       → manager@bulpan.fr / demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
