import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError } from "@/lib/auth";

export function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(serialize(data), typeof init === "number" ? { status: init } : init);
}

export function errorJson(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Convertit récursivement Decimal/Date en types JSON sûrs. */
export function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString();
    // Prisma Decimal (decimal.js) : détection structurelle, le nom de la
    // classe varie selon le bundling (Decimal, Decimal2…)
    const maybeDecimal = value as { toNumber?: () => number; d?: unknown; e?: unknown; s?: unknown };
    if (
      typeof maybeDecimal.toNumber === "function" &&
      Array.isArray(maybeDecimal.d) &&
      typeof maybeDecimal.e === "number" &&
      typeof maybeDecimal.s === "number"
    ) {
      return maybeDecimal.toNumber();
    }
    if (Array.isArray(value)) return value.map(serialize);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

/**
 * Enveloppe un handler d'API : gère AuthError, ZodError et erreurs inattendues
 * avec des réponses JSON homogènes.
 */
export function apiHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AuthError) return errorJson(error.message, error.status);
      if (error instanceof ZodError) {
        return errorJson("Données invalides", 422, error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
      }
      console.error("[api]", error);
      return errorJson("Erreur interne du serveur", 500);
    }
  };
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return schema.parse(body);
}
