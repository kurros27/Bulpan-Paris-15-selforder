export type Language = "fr" | "en";

export type BadgeType = "vegan" | "spicy" | "bestseller";

export interface ModifierOption {
  id: string;
  label: string;
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  maxSelectable: number;
  options: ModifierOption[];
  required?: boolean;
}

export interface Product {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  price: number;
  categoryId: string;
  photo: string;
  badges: BadgeType[];
  allergens: string[];
  calories?: number;
  modifierGroups?: ModifierGroup[];
  isAvailable: boolean;
  lowStock?: boolean;
}

export interface Category {
  id: string;
  name: Record<Language, string>;
  description?: Record<Language, string>;
  sortOrder: number;
}

export interface Discount {
  id: string;
  code: string;
  label: string;
  type: "amount" | "percentage";
  value: number;
  isActive: boolean;
}

export type OrderStatus =
  | "draft"
  | "placed"
  | "paid_waiting_cash"
  | "paid"
  | "in_kitchen"
  | "ready"
  | "served"
  | "picked_up"
  | "closed"
  | "canceled";

export interface OrderItemModifier {
  groupId: string;
  optionId: string;
  priceDelta: number;
  label?: string;
}

export interface OrderItem {
  productId: string;
  name: Record<Language, string>;
  quantity: number;
  unitPrice: number;
  modifiers: OrderItemModifier[];
}

export type ServiceType = "dine_in" | "takeaway";

export type PaymentMethod = "cash" | "card";

export interface PaymentRecord {
  method: PaymentMethod;
  status: "pending" | "authorized" | "captured";
  amount: number;
  reference?: string;
  processedAt?: string;
}

export interface Order {
  id: string;
  shortCode: string;
  tableId?: string;
  scheduledSlot?: string;
  serviceType: ServiceType;
  status: OrderStatus;
  payment: PaymentRecord;
  items: OrderItem[];
  discount?: Discount;
  discountAmount?: number;
  subtotal: number;
  tax: number;
  total: number;
  cashDue?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  productId: string;
  remaining: number;
  threshold: number;
}

export interface DashboardSummary {
  date: string;
  gross: number;
  net: number;
  orderCount: number;
  averageTicket: number;
  cashShare: number;
  cardShare: number;
  cancellationRate: number;
  topProducts: { productId: string; quantity: number }[];
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
