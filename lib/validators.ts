import { z } from "zod";

// ─── Authentification ───

export const registerSchema = z.object({
  restaurantName: z.string().min(2).max(80),
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(100),
});

// ─── Carte ───

export const categorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const optionChoiceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  priceDelta: z.number().min(0).max(10000),
  isAvailable: z.boolean().optional().default(true),
});

export const optionGroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(0).default(1), // 0 = illimité
  choices: z.array(optionChoiceSchema).min(1),
});

export const productSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().min(0).max(100000),
  imageUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  categoryId: z.string().min(1),
  isAvailable: z.boolean().optional(),
  prepTimeMinutes: z.number().int().min(0).max(600).optional(),
  allergens: z.array(z.string().max(40)).optional(),
  tags: z.array(z.string().max(30)).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  optionGroups: z.array(optionGroupSchema).optional(),
});

export const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

// ─── Commande client (publique) ───

export const publicOrderSchema = z.object({
  restaurantSlug: z.string().min(1),
  customerName: z.string().max(60).optional().nullable(),
  type: z.enum(["DINE_IN", "TAKEAWAY"]).default("DINE_IN"),
  tableName: z.string().max(40).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
        comment: z.string().max(300).optional().nullable(),
        choiceIds: z.array(z.string()).default([]),
      })
    )
    .min(1)
    .max(60),
});

export const orderStatusSchema = z.object({
  status: z.enum(["NEW", "ACCEPTED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"]),
});

// ─── Tables / QR ───

export const tableSchema = z.object({
  name: z.string().min(1).max(40),
  zone: z.string().max(40).optional().nullable(),
});

export const qrCodeSchema = z.object({
  label: z.string().min(1).max(60),
  tableId: z.string().optional().nullable(),
});

// ─── Paramètres ───

export const settingsSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  address: z.string().max(200).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("").transform(() => null)),
  currency: z.string().length(3).optional(),
  defaultVat: z.number().min(0).max(100).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  darkMode: z.boolean().optional(),
  openingHours: z.record(z.string(), z.string()).optional().nullable(),
  socials: z.record(z.string(), z.string()).optional().nullable(),
});

// ─── Équipe ───

export const teamMemberSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
  role: z.enum(["ADMIN", "MANAGER", "SERVER"]),
});

export const teamMemberUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  role: z.enum(["ADMIN", "MANAGER", "SERVER"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(100).optional(),
});

// ─── Super admin ───

export const adminRestaurantUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  plan: z.enum(["FREE", "STARTER", "PRO"]).optional(),
  monthlyFee: z.number().min(0).optional(),
  subscriptionEndsAt: z.string().datetime().optional().nullable(),
});

// ─── Rapports ───

export const reportScheduleSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  email: z.string().email(),
  enabled: z.boolean().default(true),
});

export const apiKeySchema = z.object({
  name: z.string().min(2).max(60),
});
