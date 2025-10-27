"use client";

import { createContext, useContext, useMemo } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { OrderItem } from "../lib/types";

export interface CartItem extends OrderItem {
  productId: string;
  id: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = usePersistentState<CartItem[]>("bulpan-cart", []);

  const value = useMemo(() => {
    const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    return {
      items,
      subtotal,
      addItem: (item: CartItem) => {
        setItems((previous) => {
          const existing = previous.find((entry) => entry.id === item.id);
          if (existing) {
            return previous.map((entry) =>
              entry.id === item.id ? { ...entry, quantity: entry.quantity + item.quantity } : entry,
            );
          }
          return [...previous, item];
        });
      },
      updateQuantity: (id: string, quantity: number) => {
        setItems((previous) => previous.map((item) => (item.id === id ? { ...item, quantity } : item)));
      },
      removeItem: (id: string) => {
        setItems((previous) => previous.filter((item) => item.id !== id));
      },
      clear: () => setItems([]),
    };
  }, [items, setItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider missing");
  return context;
}
