import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(date)
  );
}

export function formatTime(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(new Date(date));
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Nouvelle",
  ACCEPTED: "Acceptée",
  PREPARING: "En préparation",
  READY: "Prête",
  SERVED: "Servie",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Sur place",
  TAKEAWAY: "À emporter",
};

export const PRODUCT_TAGS = [
  "Nouveau",
  "Populaire",
  "Épicé",
  "Végétarien",
  "Vegan",
  "Sans gluten",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super administrateur",
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  SERVER: "Serveur",
};

export const PLAN_LABELS: Record<string, string> = {
  FREE: "Gratuit",
  STARTER: "Starter",
  PRO: "Pro",
};
