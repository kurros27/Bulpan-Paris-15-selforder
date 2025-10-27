"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClientMenu } from "../components/ClientMenu";
import { CheckoutPanel } from "../components/CheckoutPanel";
import { OrderTracker } from "../components/OrderTracker";
import { LanguageToggle } from "../components/LanguageToggle";
import { Order, ServiceType } from "../lib/types";

interface DiscountOption {
  id: string;
  code: string;
  label: string;
  type: "amount" | "percentage";
  value: number;
}

type View = "menu" | "checkout" | "status";

export default function HomePage() {
  const params = useSearchParams();
  const tableParam = params.get("table") ?? undefined;
  const defaultServiceType: ServiceType = tableParam ? "dine_in" : "takeaway";
  const [serviceTypeSelection, setServiceTypeSelection] = useState<ServiceType | null>(null);
  const [view, setView] = useState<View>("menu");
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [discounts, setDiscounts] = useState<DiscountOption[]>([]);

  const serviceType = serviceTypeSelection ?? defaultServiceType;

  const tableLabel = useMemo(() => (tableParam ? `Table ${tableParam}` : ""), [tableParam]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Bulpan Paris 15</h1>
          <p>Commandez en toute autonomie {tableLabel && `· ${tableLabel}`}</p>
        </div>
        <LanguageToggle />
      </header>

      {view === "menu" && (
        <ClientMenu
          serviceType={serviceType}
          onServiceTypeChange={(type) => setServiceTypeSelection(type)}
          tableId={tableParam ?? undefined}
          onCheckout={(codes) => {
            setDiscounts(codes);
            setView("checkout");
          }}
        />
      )}

      {view === "checkout" && (
        <CheckoutPanel
          serviceType={serviceType}
          tableId={tableParam ?? undefined}
          discounts={discounts}
          onClose={() => setView("menu")}
          onSuccess={(order) => {
            setActiveOrder(order);
            setView("status");
          }}
        />
      )}

      {view === "status" && activeOrder && (
        <OrderTracker
          order={activeOrder}
          onClose={() => {
            setActiveOrder(null);
            setView("menu");
          }}
        />
      )}
    </main>
  );
}
