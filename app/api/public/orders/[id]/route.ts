import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json } from "@/lib/api";

/** Suivi public d'une commande (le client ne voit que l'essentiel). */
export const GET = apiHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        status: true,
        type: true,
        tableName: true,
        totalAmount: true,
        createdAt: true,
        items: {
          select: { productName: true, quantity: true, totalPrice: true, options: true, comment: true },
        },
        restaurant: { select: { name: true, slug: true, currency: true, primaryColor: true } },
      },
    });
    if (!order) return errorJson("Commande introuvable", 404);
    return json(order);
  }
);
