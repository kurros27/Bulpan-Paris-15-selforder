"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "../lib/format";
import { cn } from "../lib/cn";
import { Product } from "../lib/types";
import { Badge } from "./Badge";
import { StockIndicator } from "./StockIndicator";

interface Props {
  product: Product;
  language: "fr" | "en";
  onAdd: (options: { quantity: number; modifiers: string[] }) => void;
}

export function ProductCard({ product, language, onAdd }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const locale = language === "fr" ? "fr-FR" : "en-GB";

  const modifierTotal = useMemo(() => {
    if (!product.modifierGroups) return 0;
    return product.modifierGroups.reduce((sum, group) => {
      return (
        sum +
        group.options
          .filter((option) => selectedOptions.includes(option.id))
          .reduce((total, option) => total + option.priceDelta, 0)
      );
    }, 0);
  }, [product.modifierGroups, selectedOptions]);

  const finalPrice = (product.price + modifierTotal) * quantity;

  function toggleOption(groupId: string, optionId: string) {
    setSelectedOptions((previous) => {
      const group = product.modifierGroups?.find((entry) => entry.id === groupId);
      if (!group) return previous;
      const isSelected = previous.includes(optionId);
      if (isSelected) {
        return previous.filter((id) => id !== optionId);
      }

      const groupOptionIds = group.options.map((option) => option.id);
      if (group.maxSelectable === 1) {
        return [...previous.filter((id) => !groupOptionIds.includes(id)), optionId];
      }

      const groupSelectedCount = previous.filter((id) => groupOptionIds.includes(id)).length;
      if (groupSelectedCount >= (group.maxSelectable ?? Infinity)) {
        return previous;
      }
      return [...previous, optionId];
    });
  }

  const allergens = product.allergens.join(", ");

  return (
    <article className="product-card" aria-live="polite">
      <div
        className="product-visual"
        role="presentation"
        aria-hidden="true"
        style={{ backgroundImage: `url(${product.photo})` }}
      />
      <header>
        <div>
          <h3>{product.name[language]}</h3>
          <p className="description">{product.description[language]}</p>
          <div className="badge-row">
            {product.badges.map((badge) => (
              <Badge key={badge} type={badge} language={language} />
            ))}
          </div>
        </div>
        <div className="price-block">
          <strong>{formatPrice(product.price, locale)}</strong>
          <StockIndicator isAvailable={product.isAvailable} lowStock={product.lowStock} />
        </div>
      </header>
      <button
        type="button"
        className="expand"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Masquer" : "Personnaliser"}
      </button>
      {expanded && (
        <div className="product-details">
          {product.modifierGroups?.map((group) => (
            <fieldset key={group.id}>
              <legend>
                {group.name}
                {group.required ? " *" : ""}
              </legend>
              <div className="options">
                {group.options.map((option) => {
                  const checked = selectedOptions.includes(option.id);
                  return (
                    <label key={option.id} className={cn("option", checked && "selected")}> 
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(group.id, option.id)}
                        aria-checked={checked}
                      />
                      <span>{option.label}</span>
                      {option.priceDelta > 0 && <small>+{formatPrice(option.priceDelta, locale)}</small>}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="controls">
            <label>
              Quantité
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              />
            </label>
            <button
              type="button"
              className="primary"
              disabled={!product.isAvailable}
              onClick={() => {
                onAdd({ quantity, modifiers: selectedOptions });
                setQuantity(1);
                setExpanded(false);
                setSelectedOptions([]);
              }}
            >
              Ajouter {formatPrice(finalPrice, locale)}
            </button>
          </div>
          <p className="meta" aria-live="polite">
            Allergènes : {allergens || "Aucun"}
            {product.calories ? ` · ${product.calories} kcal` : ""}
          </p>
        </div>
      )}
    </article>
  );
}
