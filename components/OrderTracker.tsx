"use client";

import { useMemo } from "react";
import { useLiveData } from "../hooks/useLiveData";
import { formatPrice } from "../lib/format";
import { Order, OrderStatus } from "../lib/types";
import { useLanguage } from "./LanguageContext";

const STATUS_FLOW: OrderStatus[] = [
  "placed",
  "paid_waiting_cash",
  "paid",
  "in_kitchen",
  "ready",
  "served",
  "picked_up",
  "closed",
];

interface Props {
  order: Order;
  onClose: () => void;
}

export function OrderTracker({ order, onClose }: Props) {
  const { t, language } = useLanguage();
  const locale = language === "fr" ? "fr-FR" : "en-GB";
  const { data } = useLiveData<Order>(`/api/orders/${order.id}`, {
    initial: order,
    interval: 2500,
  });

  const currentStatus = data?.status ?? order.status;
  const paid = data?.payment.status === "captured";

  const timeline = useMemo(
    () =>
      STATUS_FLOW.map((status) => ({
        status,
        label: t(status),
        reached: STATUS_FLOW.indexOf(status) <= STATUS_FLOW.indexOf(currentStatus),
      })),
    [currentStatus, t],
  );

  return (
    <section className="order-tracker" aria-live="polite">
      <header>
        <div>
          <h2>Commande #{data?.shortCode ?? order.shortCode}</h2>
          <p>
            Statut : <strong>{t(currentStatus)}</strong>
          </p>
        </div>
        <button type="button" onClick={onClose} className="ghost">
          Nouvelle commande
        </button>
      </header>

      <div className="timeline">
        {timeline.map((entry) => (
          <div key={entry.status} className={entry.reached ? "step reached" : "step"}>
            <span>{entry.label}</span>
          </div>
        ))}
      </div>

      <div className="tracker-summary">
        <p>Total réglé : {formatPrice(data?.total ?? order.total, locale)}</p>
        <p>Mode de paiement : {data?.payment.method === "card" ? "Carte" : "Espèces"}</p>
        <p>Encaissement : {paid ? "Confirmé" : "En attente"}</p>
      </div>

      {currentStatus === "canceled" && <p className="error">{t("canceled")}</p>}

      <section>
        <h3>Détails</h3>
        <ul>
          {data?.items.map((item) => (
            <li key={item.productId}>
              {item.quantity} × {item.name[language]} · {formatPrice(item.unitPrice * item.quantity, locale)}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
