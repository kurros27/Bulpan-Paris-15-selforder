import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ isActive: z.boolean() });

export const PATCH = apiHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const admin = await requireUser(["SUPER_ADMIN"]);
    const { id } = await params;
    const { isActive } = await parseBody(request, schema);

    if (id === admin.id) return errorJson("Impossible de modifier votre propre compte", 400);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorJson("Utilisateur introuvable", 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
    await logActivity({
      action: isActive ? "admin.user.activate" : "admin.user.deactivate",
      userId: admin.id,
      entity: "User",
      entityId: id,
      details: { email: user.email },
    });
    return json(updated);
  }
);
