import { prisma } from "@/lib/prisma";

type AuditInput = {
  action: string;
  restaurantId?: string | null;
  userId?: string | null;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string | null;
};

/** Journalise une action. Ne doit jamais faire échouer la requête appelante. */
export async function logActivity(input: AuditInput) {
  try {
    await prisma.activityLog.create({
      data: {
        action: input.action,
        restaurantId: input.restaurantId ?? null,
        userId: input.userId ?? null,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details as never,
        ip: input.ip ?? null,
      },
    });
  } catch (error) {
    console.error("[audit]", error);
  }
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
