import { categories, discounts, products } from "../data/menu";
import {
  AuditEvent,
  DashboardSummary,
  Discount,
  InventoryItem,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
} from "../types";

const TAX_RATE = 0.1;

interface StoreShape {
  products: Product[];
  categories: typeof categories;
  discounts: Discount[];
  orders: Order[];
  inventory: Record<string, InventoryItem>;
  auditLog: AuditEvent[];
}

declare global {
  var __bulpanStore: StoreShape | undefined;
}

function buildInitialInventory(): Record<string, InventoryItem> {
  return products.reduce((acc, product) => {
    acc[product.id] = {
      productId: product.id,
      remaining: product.lowStock ? 5 : 20,
      threshold: 4,
    };
    return acc;
  }, {} as Record<string, InventoryItem>);
}

function getStore(): StoreShape {
  if (!global.__bulpanStore) {
    global.__bulpanStore = {
      products: JSON.parse(JSON.stringify(products)),
      categories,
      discounts: JSON.parse(JSON.stringify(discounts)),
      orders: [],
      inventory: buildInitialInventory(),
      auditLog: [],
    };
  }
  return global.__bulpanStore;
}

function logEvent(action: string, actor: string, metadata?: Record<string, unknown>) {
  const store = getStore();
  store.auditLog.unshift({
    id: crypto.randomUUID(),
    action,
    actor,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

function formatCurrency(amount: number) {
  return Math.round(amount);
}

interface CreateOrderPayload {
  tableId?: string;
  scheduledSlot?: string;
  serviceType: "dine_in" | "takeaway";
  paymentMethod: PaymentMethod;
  discountCode?: string;
  items: {
    productId: string;
    quantity: number;
    modifierOptionIds?: string[];
  }[];
  notes?: string;
}

function resolveModifiers(product: Product, optionIds: string[] | undefined) {
  const resolved = [] as {
    groupId: string;
    optionId: string;
    priceDelta: number;
    label?: string;
  }[];
  if (!product.modifierGroups || !optionIds) return resolved;

  product.modifierGroups.forEach((group) => {
    group.options.forEach((option) => {
      if (optionIds.includes(option.id)) {
        resolved.push({
          groupId: group.id,
          optionId: option.id,
          priceDelta: option.priceDelta,
          label: option.label,
        });
      }
    });
  });
  return resolved;
}

export function createOrder(payload: CreateOrderPayload): Order {
  const store = getStore();
  const createdAt = new Date();
  const items = payload.items.map((raw) => {
    const product = store.products.find((p) => p.id === raw.productId);
    if (!product) throw new Error("Produit introuvable");
    const modifiers = resolveModifiers(product, raw.modifierOptionIds);
    const modifierTotal = modifiers.reduce((total, mod) => total + mod.priceDelta, 0);
    const unitPrice = product.price + modifierTotal;
    return {
      productId: product.id,
      name: product.name,
      quantity: raw.quantity,
      unitPrice,
      modifiers,
    };
  });

  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const discount = payload.discountCode
    ? store.discounts.find((d) => d.isActive && d.code.toLowerCase() === payload.discountCode?.toLowerCase())
    : undefined;
  const discountValue = discount
    ? discount.type === "amount"
      ? discount.value
      : Math.round((subtotal * discount.value) / 100)
    : 0;
  const taxedSubtotal = Math.max(subtotal - discountValue, 0);
  const tax = Math.round(taxedSubtotal * TAX_RATE);
  const total = formatCurrency(taxedSubtotal + tax);

  const paymentStatus = payload.paymentMethod === "card" ? "captured" : "pending";
  const orderStatus: OrderStatus =
    payload.paymentMethod === "card"
      ? "paid"
      : "paid_waiting_cash";

  const order: Order = {
    id: crypto.randomUUID(),
    shortCode: `${createdAt.getHours()}${createdAt.getMinutes()}-${Math.floor(Math.random() * 90 + 10)}`,
    tableId: payload.serviceType === "dine_in" ? payload.tableId : undefined,
    scheduledSlot: payload.serviceType === "takeaway" ? payload.scheduledSlot : undefined,
    serviceType: payload.serviceType,
    status: orderStatus,
    payment: {
      method: payload.paymentMethod,
      status: paymentStatus,
      amount: total,
      reference: payload.paymentMethod === "card" ? `CARD-${Date.now()}` : undefined,
      processedAt: paymentStatus === "captured" ? createdAt.toISOString() : undefined,
    },
    items,
    discount,
    discountAmount: discountValue,
    subtotal,
    tax,
    total,
    cashDue: payload.paymentMethod === "cash" ? total : undefined,
    notes: payload.notes,
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  };

  store.orders.unshift(order);
  items.forEach((item) => {
    const inventory = store.inventory[item.productId];
    if (inventory) {
      inventory.remaining = Math.max(inventory.remaining - item.quantity, 0);
      if (inventory.remaining <= inventory.threshold) {
        const product = store.products.find((p) => p.id === item.productId);
        if (product) {
          product.lowStock = inventory.remaining > 0;
          product.isAvailable = inventory.remaining > 0;
        }
      }
    }
  });

  logEvent("order.created", payload.paymentMethod === "card" ? "client(card)" : "client(cash)", {
    orderId: order.id,
    serviceType: payload.serviceType,
  });

  return order;
}

export function updateOrderStatus(orderId: string, status: OrderStatus, actor: string) {
  const store = getStore();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("Commande introuvable");
  order.status = status;
  if (status === "paid" && order.payment.status !== "captured") {
    order.payment.status = "captured";
    order.payment.processedAt = new Date().toISOString();
  }
  order.updatedAt = new Date().toISOString();
  logEvent("order.status", actor, { orderId, status });
  return order;
}

export function captureCashPayment(orderId: string, actor: string) {
  const store = getStore();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("Commande introuvable");
  order.payment.status = "captured";
  order.payment.processedAt = new Date().toISOString();
  order.status = "paid";
  order.updatedAt = new Date().toISOString();
  logEvent("payment.cash_captured", actor, { orderId });
  return order;
}

export function getOrders(filter?: Partial<{ status: OrderStatus; paymentMethod: PaymentMethod }>) {
  const store = getStore();
  return store.orders.filter((order) => {
    if (filter?.status && order.status !== filter.status) return false;
    if (filter?.paymentMethod && order.payment.method !== filter.paymentMethod) return false;
    return true;
  });
}

export function getOrder(orderId: string) {
  const store = getStore();
  return store.orders.find((order) => order.id === orderId) ?? null;
}

export function getMenuData() {
  const store = getStore();
  return {
    categories: [...store.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    products: store.products,
    discounts: store.discounts.filter((d) => d.isActive),
  };
}

export function setProductAvailability(productId: string, isAvailable: boolean, actor: string) {
  const store = getStore();
  const product = store.products.find((p) => p.id === productId);
  if (!product) throw new Error("Produit introuvable");
  product.isAvailable = isAvailable;
  if (isAvailable) {
    store.inventory[productId].remaining = Math.max(store.inventory[productId].remaining, 5);
  }
  logEvent("product.availability", actor, { productId, isAvailable });
  return product;
}

export function upsertProduct(payload: Partial<Product> & { id?: string }, actor: string) {
  const store = getStore();
  const id = payload.id ?? crypto.randomUUID();
  const existingIndex = store.products.findIndex((p) => p.id === id);
  const product: Product = {
    id,
    name: payload.name ?? { fr: "Nouveau produit", en: "New product" },
    description: payload.description ?? { fr: "", en: "" },
    price: payload.price ?? 0,
    categoryId: payload.categoryId ?? store.categories[0].id,
    photo: payload.photo ?? "/images/placeholder.jpg",
    badges: payload.badges ?? [],
    allergens: payload.allergens ?? [],
    calories: payload.calories,
    modifierGroups: payload.modifierGroups,
    isAvailable: payload.isAvailable ?? true,
    lowStock: payload.lowStock,
  };

  if (existingIndex >= 0) {
    store.products[existingIndex] = product;
    logEvent("product.updated", actor, { productId: id });
  } else {
    store.products.push(product);
    store.inventory[id] = { productId: id, remaining: 20, threshold: 4 };
    logEvent("product.created", actor, { productId: id });
  }

  return product;
}

export function getDashboardSummary(date: string): DashboardSummary {
  const store = getStore();
  const sameDayOrders = store.orders.filter((order) => order.createdAt.startsWith(date));
  const gross = sameDayOrders.reduce((sum, order) => sum + order.total, 0);
  const net = sameDayOrders.reduce((sum, order) => sum + (order.subtotal - (order.discountAmount ?? 0)), 0);
  const orderCount = sameDayOrders.length;
  const averageTicket = orderCount ? Math.round(gross / orderCount) : 0;
  const cardOrders = sameDayOrders.filter((order) => order.payment.method === "card");
  const cashOrders = sameDayOrders.filter((order) => order.payment.method === "cash");
  const cancellations = sameDayOrders.filter((order) => order.status === "canceled");
  const productSales: Record<string, number> = {};
  sameDayOrders.forEach((order) => {
    order.items.forEach((item) => {
      productSales[item.productId] = (productSales[item.productId] ?? 0) + item.quantity;
    });
  });
  const topProducts = Object.entries(productSales)
    .sort(([, aQty], [, bQty]) => bQty - aQty)
    .slice(0, 5)
    .map(([productId, quantity]) => ({ productId, quantity }));

  return {
    date,
    gross,
    net,
    orderCount,
    averageTicket,
    cashShare: gross ? Math.round((cashOrders.reduce((sum, order) => sum + order.total, 0) / gross) * 100) : 0,
    cardShare: gross ? Math.round((cardOrders.reduce((sum, order) => sum + order.total, 0) / gross) * 100) : 0,
    cancellationRate: orderCount ? Math.round((cancellations.length / orderCount) * 100) : 0,
    topProducts,
  };
}

export function getAuditLog() {
  const store = getStore();
  return store.auditLog;
}

export function getInventory() {
  const store = getStore();
  return store.inventory;
}

export function getDiscounts() {
  const store = getStore();
  return store.discounts;
}
