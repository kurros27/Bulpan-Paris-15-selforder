import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/api";
import { notFound } from "next/navigation";
import { MenuClient, type PublicMenu } from "@/components/menu/menu-client";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  return {
    title: restaurant ? `${restaurant.name} — Menu` : "Menu",
    description: restaurant?.description ?? undefined,
  };
}

export default async function MenuPage({ params }: Props) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      address: true,
      phone: true,
      currency: true,
      primaryColor: true,
      darkMode: true,
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
    },
  });

  if (!restaurant || restaurant.status === "SUSPENDED") notFound();

  const { status: _status, ...menu } = restaurant;
  void _status;
  return <MenuClient menu={serialize(menu) as PublicMenu} />;
}
