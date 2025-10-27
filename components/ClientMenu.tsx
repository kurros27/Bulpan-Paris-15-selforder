"use client";

import { useMemo, useState } from "react";
import { useLiveData } from "../hooks/useLiveData";
import { useCart } from "./CartContext";
import { ProductCard } from "./ProductCard";
import { useLanguage } from "./LanguageContext";
import { formatPrice } from "../lib/format";
import { OrderItemModifier, Product, ServiceType } from "../lib/types";

interface MenuResponse {
  categories: { id: string; name: { fr: string; en: string }; description?: { fr: string; en: string } }[];
  products: Product[];
  discounts: { id: string; code: string; label: string; type: "amount" | "percentage"; value: number }[];
}

interface Props {
  serviceType: ServiceType;
  onServiceTypeChange: (type: ServiceType) => void;
  tableId?: string;
  onCheckout: (discounts: MenuResponse["discounts"]) => void;
}

export function ClientMenu({ serviceType, onServiceTypeChange, tableId, onCheckout }: Props) {
  const { data, loading } = useLiveData<MenuResponse>("/api/menu", { interval: 8000 });
  const { addItem, items, subtotal } = useCart();
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const locale = language === "fr" ? "fr-FR" : "en-GB";

  const filteredProducts = useMemo(() => {
    if (!data) return [] as Product[];
    return data.products.filter((product) => {
      if (selectedCategory && product.categoryId !== selectedCategory) return false;
      if (search) {
        const term = search.toLowerCase();
        return (
          product.name.fr.toLowerCase().includes(term) ||
          product.name.en.toLowerCase().includes(term) ||
          product.description.fr.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [data, search, selectedCategory]);

  function resolveModifiers(product: Product, optionIds: string[]): OrderItemModifier[] {
    if (!product.modifierGroups) return [];
    return product.modifierGroups.flatMap((group) =>
      group.options
        .filter((option) => optionIds.includes(option.id))
        .map((option) => ({
          groupId: group.id,
          optionId: option.id,
          priceDelta: option.priceDelta,
          label: option.label,
        })),
    );
  }

  function handleAdd(product: Product, quantity: number, modifierIds: string[]) {
    const modifiers = resolveModifiers(product, modifierIds);
    const modifierTotal = modifiers.reduce((total, mod) => total + mod.priceDelta, 0);
    const unitPrice = product.price + modifierTotal;
    const idKey = `${product.id}-${modifierIds.slice().sort().join("-") || "base"}`;
    addItem({
      id: idKey,
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice,
      modifiers,
    });
  }

  return (
    <section className="client-menu">
      <header className="client-menu__header">
        <div>
          <h1>Bulpan</h1>
          <p className="muted">
            {serviceType === "dine_in" ? `${t("dine_in")} · Table ${tableId ?? "?"}` : t("takeaway")}
          </p>
        </div>
        <div className="service-switch" role="group" aria-label="Mode de service">
          <button
            type="button"
            className={serviceType === "dine_in" ? "active" : ""}
            onClick={() => onServiceTypeChange("dine_in")}
          >
            {t("dine_in")}
          </button>
          <button
            type="button"
            className={serviceType === "takeaway" ? "active" : ""}
            onClick={() => onServiceTypeChange("takeaway")}
          >
            {t("takeaway")}
          </button>
        </div>
      </header>
      <div className="toolbar">
        <input
          type="search"
          placeholder={language === "fr" ? "Rechercher un plat" : "Search a dish"}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="categories" role="tablist">
          <button
            type="button"
            className={!selectedCategory ? "active" : ""}
            onClick={() => setSelectedCategory(null)}
          >
            Tous
          </button>
          {data?.categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={selectedCategory === category.id ? "active" : ""}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name[language]}
            </button>
          ))}
        </div>
      </div>

      {loading && <p role="status">Chargement du menu…</p>}

      <div className="product-grid">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            language={language}
            onAdd={({ quantity, modifiers }) => handleAdd(product, quantity, modifiers)}
          />
        ))}
      </div>

      <aside className="cart-summary" aria-live="polite">
        <p>
          {items.length} article{items.length > 1 ? "s" : ""} · {formatPrice(subtotal, locale)}
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => data && onCheckout(data.discounts)}
          disabled={!items.length || !data}
        >
          {t("checkout")}
        </button>
      </aside>
    </section>
  );
}
