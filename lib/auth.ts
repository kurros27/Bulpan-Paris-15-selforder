import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/generated/prisma/enums";

const COOKIE_NAME = "session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 jours

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: Role;
  restaurantId: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      role: payload.role as Role,
      restaurantId: (payload.restaurantId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Récupère l'utilisateur courant, vérifie son rôle et le statut du restaurant.
 * Lève AuthError (401/403) si la requête n'est pas autorisée.
 */
export async function requireUser(allowedRoles?: Role[]) {
  const session = await getSession();
  if (!session) throw new AuthError("Non authentifié", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { restaurant: { select: { id: true, status: true, slug: true, name: true } } },
  });
  if (!user || !user.isActive) throw new AuthError("Compte désactivé", 401);
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new AuthError("Accès refusé", 403);
  }
  if (user.role !== "SUPER_ADMIN" && user.restaurant?.status === "SUSPENDED") {
    throw new AuthError("Restaurant suspendu", 403);
  }
  return user;
}

/** Rôles autorisés à gérer un restaurant (tout sauf super admin qui a son espace dédié). */
export const RESTAURANT_ROLES: Role[] = ["ADMIN", "MANAGER", "SERVER"];
/** Rôles autorisés à modifier la carte et les paramètres. */
export const MANAGER_ROLES: Role[] = ["ADMIN", "MANAGER"];

/** Utilisateur d'un restaurant : vérifie la présence d'un restaurant rattaché. */
export async function requireRestaurantUser(roles: Role[] = RESTAURANT_ROLES) {
  const user = await requireUser(roles);
  if (!user.restaurantId) throw new AuthError("Aucun restaurant associé", 403);
  return user as typeof user & { restaurantId: string };
}
