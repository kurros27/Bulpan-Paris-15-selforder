import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson } from "@/lib/api";
import { requireRestaurantUser } from "@/lib/auth";

/** Image PNG du QR Code (?size=600 pour l'impression haute résolution). */
export const GET = apiHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRestaurantUser();
    const { id } = await params;

    const qrCode = await prisma.qrCode.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: { table: true, restaurant: { select: { slug: true } } },
    });
    if (!qrCode) return errorJson("QR Code introuvable", 404);

    const url = new URL(request.url);
    const size = Math.min(2000, Math.max(120, parseInt(url.searchParams.get("size") ?? "600", 10) || 600));

    const base = process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`;
    const target = new URL(`${base}/menu/${qrCode.restaurant.slug}`);
    if (qrCode.table) target.searchParams.set("table", qrCode.table.name);
    target.searchParams.set("qr", qrCode.id);

    const png = await QRCode.toBuffer(target.toString(), {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="qr-${qrCode.label.replace(/[^a-z0-9]/gi, "-")}.png"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }
);
