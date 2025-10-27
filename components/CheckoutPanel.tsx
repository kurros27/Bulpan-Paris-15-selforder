"use client";

import { useMemo, useState } from "react";
import { useCart } from "./CartContext";
import { formatPrice } from "../lib/format";
import { Order, PaymentMethod, ServiceType } from "../lib/types";
import { useLanguage } from "./LanguageContext";

interface DiscountOption {
  id: string;
  code: string;
  label: string;
  type: "amount" | "percentage";
  value: number;
}

interface Props {
  serviceType: ServiceType;
  tableId?: string;
  discounts: DiscountOption[];
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

export function CheckoutPanel({ serviceType, tableId, discounts, onClose, onSuccess }: Props) {
  const { items, subtotal, updateQuantity, removeItem, clear } = useCart();
  const { language, t } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [scheduledSlot, setScheduledSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountOption | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = language === "fr" ? "fr-FR" : "en-GB";

  const discountValue = useMemo(() => {
    if (!appliedDiscount) return 0;
    const raw =
      appliedDiscount.type === "amount"
        ? appliedDiscount.value
        : Math.round((subtotal * appliedDiscount.value) / 100);
    return Math.min(raw, subtotal);
  }, [appliedDiscount, subtotal]);

  const tax = useMemo(() => Math.round((Math.max(subtotal - discountValue, 0) * 10) / 100), [discountValue, subtotal]);
  const total = useMemo(() => Math.max(subtotal - discountValue, 0) + tax, [discountValue, subtotal, tax]);

  function applyCode() {
    const match = discounts.find((discount) => discount.code.toLowerCase() === promoCode.toLowerCase());
    if (match) {
      setAppliedDiscount(match);
      setPromoCode("");
      setError(null);
    } else {
      setError("Code promo invalide");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!items.length) return;
    try {
      setProcessing(true);
      setError(null);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          tableId,
          scheduledSlot: serviceType === "takeaway" ? scheduledSlot || undefined : undefined,
          paymentMethod,
          discountCode: appliedDiscount?.code,
          notes,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            modifierOptionIds: item.modifiers.map((modifier) => modifier.optionId),
          })),
        }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Commande impossible");
      }
      const order = await response.json();
      clear();
      onSuccess(order);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="checkout-panel" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="checkout-form">
        <header>
          <h2>{t("checkout")}</h2>
          <button type="button" onClick={onClose} className="ghost">
            Fermer
          </button>
        </header>
        <section className="checkout-items">
          {items.length === 0 && <p>{t("basket_empty")}</p>}
          {items.map((item) => (
            <div key={item.id} className="checkout-item">
              <div>
                <p>{item.name[language]}</p>
                <small>{formatPrice(item.unitPrice, locale)} · x{item.quantity}</small>
                {item.modifiers.length > 0 && (
                  <ul>
                    {item.modifiers.map((modifier) => (
                      <li key={modifier.optionId}>{modifier.label ?? modifier.optionId}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="controls">
                <label>
                  Qté
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => updateQuantity(item.id, Number(event.target.value) || 1)}
                  />
                </label>
                <button type="button" className="ghost" onClick={() => removeItem(item.id)}>
                  {t("remove")}
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="checkout-section">
          <h3>Mode de paiement</h3>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="payment"
                value="cash"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
              />
              {t("cash_payment")}
            </label>
            <label>
              <input
                type="radio"
                name="payment"
                value="card"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
              />
              {t("card_payment")}
            </label>
          </div>
        </section>

        {serviceType === "takeaway" && (
          <section className="checkout-section">
            <h3>Créneau de retrait</h3>
            <input
              type="time"
              value={scheduledSlot}
              onChange={(event) => setScheduledSlot(event.target.value)}
            />
          </section>
        )}

        <section className="checkout-section">
          <h3>{t("promo_code")}</h3>
          <div className="promo">
            <input
              type="text"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder={appliedDiscount ? appliedDiscount.code : "Saisir un code"}
            />
            <button type="button" onClick={applyCode} disabled={!promoCode.trim()}>
              {t("apply")}
            </button>
            {appliedDiscount && (
              <span className="applied">
                {appliedDiscount.label}
                <button type="button" onClick={() => setAppliedDiscount(null)}>
                  {t("remove")}
                </button>
              </span>
            )}
          </div>
        </section>

        <section className="checkout-section">
          <h3>{t("notes")}</h3>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </section>

        <section className="summary">
          <div>
            <span>{t("subtotal")}</span>
            <strong>{formatPrice(subtotal, locale)}</strong>
          </div>
          <div>
            <span>Remise</span>
            <strong>-{formatPrice(discountValue, locale)}</strong>
          </div>
          <div>
            <span>{t("taxes")}</span>
            <strong>{formatPrice(tax, locale)}</strong>
          </div>
          <div className="total">
            <span>{t("total")}</span>
            <strong>{formatPrice(total, locale)}</strong>
          </div>
        </section>

        {paymentMethod === "cash" && (
          <section className="checkout-section">
            <h3>Présentation à la caisse</h3>
            <p>Montant à régler : {formatPrice(total, locale)}</p>
            <div className="cash-tag">#{Math.floor(total / 37)}</div>
          </section>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <footer>
          <button type="submit" className="primary" disabled={processing || !items.length}>
            {processing ? "Envoi en cours…" : t("confirm_order")}
          </button>
        </footer>
      </form>
    </div>
  );
}
