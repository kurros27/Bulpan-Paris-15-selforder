"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChefHat, BellRing, PartyPopper, XCircle, Clock } from "lucide-react";
import { api } from "@/lib/client";
import { formatCurrency } from "@/lib/utils";
import { Spinner } from "@/components/ui";

type PublicOrder = {
  id: string;
  number: number;
  status: string;
  type: string;
  tableName: string | null;
  totalAmount: number;
  items: { productName: string; quantity: number; totalPrice: number }[];
  restaurant: { name: string; slug: string; currency: string; primaryColor: string };
};

const STEPS: { status: string[]; label: string; icon: typeof Clock }[] = [
  { status: ["NEW"], label: "Commande envoyée", icon: CheckCircle2 },
  { status: ["ACCEPTED", "PREPARING"], label: "En préparation", icon: ChefHat },
  { status: ["READY"], label: "Prête !", icon: BellRing },
  { status: ["SERVED", "COMPLETED"], label: "Servie — bon appétit", icon: PartyPopper },
];

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      api<PublicOrder>(`/api/public/orders/${id}`)
        .then((o) => mounted && setOrder(o))
        .catch(() => mounted && setNotFound(true));
    load();
    const interval = setInterval(load, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <XCircle className="h-10 w-10 text-critical" aria-hidden />
        <p className="font-medium">Commande introuvable</p>
        <Link href={`/menu/${slug}`} className="text-sm text-brand">
          Retour au menu
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const brand = order.restaurant.primaryColor;
  const cancelled = order.status === "CANCELLED";
  const currentStep = STEPS.findIndex((s) => s.status.includes(order.status));

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14" style={{ color: brand }} aria-hidden />
        <h1 className="mt-3 text-xl font-bold">Votre commande a bien été envoyée.</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {order.restaurant.name} — commande n° {order.number}
          {order.tableName ? ` · Table ${order.tableName}` : ""}
        </p>
      </div>

      {cancelled ? (
        <p className="mt-8 rounded-xl bg-critical/10 p-4 text-center text-sm font-medium text-critical">
          Cette commande a été annulée. Adressez-vous au personnel pour plus d'informations.
        </p>
      ) : (
        <ol className="mt-8 space-y-4" aria-label="Suivi de la commande">
          {STEPS.map((step, index) => {
            const reached = currentStep >= index;
            const Icon = step.icon;
            return (
              <li key={step.label} className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                  style={{ background: reached ? brand : "var(--gridline)" }}
                  aria-hidden
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className={reached ? "font-medium" : "text-ink-muted"}>{step.label}</span>
                {currentStep === index && index < 3 ? (
                  <span className="ml-auto text-xs text-ink-muted" aria-live="polite">
                    en cours…
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-8 rounded-xl border border-hairline bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">Récapitulatif</h2>
        <ul className="space-y-1 text-sm text-ink-secondary">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {item.quantity}× {item.productName}
              </span>
              <span>{formatCurrency(item.totalPrice, order.restaurant.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-hairline pt-2 font-semibold text-ink">
          <span>Total</span>
          <span>{formatCurrency(order.totalAmount, order.restaurant.currency)}</span>
        </p>
      </div>

      <Link
        href={`/menu/${slug}`}
        className="mt-6 rounded-xl border border-hairline bg-surface py-3 text-center text-sm font-medium"
      >
        Commander autre chose
      </Link>
    </div>
  );
}
