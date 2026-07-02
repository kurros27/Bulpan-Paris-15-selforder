import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json } from "@/lib/api";

export const GET = apiHandler(
  async (_request: Request, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        address: true,
        phone: true,
        currency: true,
        primaryColor: true,
        darkMode: true,
        openingHours: true,
        socials: true,
        status: true,
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            products: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
                isAvailable: true,
                prepTimeMinutes: true,
                allergens: true,
                tags: true,
                optionGroups: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    id: true,
                    name: true,
                    isRequired: true,
                    minSelect: true,
                    maxSelect: true,
                    choices: {
                      where: { isAvailable: true },
                      orderBy: { sortOrder: "asc" },
                      select: { id: true, name: true, priceDelta: true },
                    },
                  },
                },
              },
            },
          },
        },
        tables: { select: { id: true, name: true, zone: true }, orderBy: { name: "asc" } },
      },
    });

    if (!restaurant || restaurant.status === "SUSPENDED") {
      return errorJson("Restaurant introuvable", 404);
    }

    const { status: _status, ...publicData } = restaurant;
    void _status;
    return json(publicData);
  }
);
