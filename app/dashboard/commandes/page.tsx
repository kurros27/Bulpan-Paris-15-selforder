"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { api, playOrderChime } from "@/lib/client";
import { cn, formatCurrency, formatTime, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  comment: string | null;
  options: { group: string; choice: string; priceDelta: number }[] | null;
};

type Order = {
  id: string;
  number: number;
  customerName: string | null;
  type: "DINE_IN" | "TAKEAWAY";
  status: string;
  tableName: string | null;
  note: string | null;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

const COLUMNS: { status: string[]; title: string; next: { to: string; label: string }[] }[] = [
  {
    status: ["NEW"],
    title: "Nouvelles",
    next: [
      { to: "ACCEPTED", label: "Accepter" },
      { to: "CANCELLED", label: "Annuler" },
    ],
  },
  {
    status: ["ACCEPTED", "PREPARING"],
    title: "En préparation",
    next: [
      { to: "PREPARING", label: "En cuisine" },
      { to: "READY", label: "Prête" },
      { to: "CANCELLED", label: "Annuler" },
    ],
  },
  {
    status: ["READY"],
    title: "Prêtes",
    next: [
      { to: "SERVED", label: "Servie" },
      { to: "COMPLETED", label: "Terminer" },
    ],
  },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [connected, setConnected] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(true);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const load = useCallback(() => {
    api<{ orders: Order[] }>("/api/orders?active=1").then(({ orders }) => setOrders(orders));
  }, []);

  useEffect(() => {
    api<{ orders: Order[] }>("/api/orders?active=1").then(({ orders }) => setOrders(orders));
  }, []);

  // Abonnement SSE : nouvelles commandes + changements de statut en direct
  useEffect(() => {
    const source = new EventSource("/api/orders/stream");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { kind: string; order?: Order };
        if (data.kind === "connected") setConnected(true);
        if (data.kind === "order.created" && data.order) {
          setOrders((prev) => (prev ? [data.order!, ...prev.filter((o) => o.id !== data.order!.id)] : prev));
          if (soundRef.current) playOrderChime();
        }
        if (data.kind === "order.updated" && data.order) {
          setOrders((prev) =>
            prev ? prev.map((o) => (o.id === data.order!.id ? data.order! : o)) : prev
          );
        }
      } catch {
        // message non JSON : ignoré
      }
    };
    return () => source.close();
  }, []);

  async function changeStatus(order: Order, status: string) {
    // Mise à jour optimiste, réconciliée par l'événement SSE
    setOrders((prev) => (prev ? prev.map((o) => (o.id === order.id ? { ...o, status } : o)) : prev));
    try {
      await api(`/api/orders/${order.id}/status`, { method: "PATCH", json: { status } });
    } catch {
      load();
    }
  }

  if (!orders) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const visible = orders.filter((o) => !["COMPLETED", "CANCELLED", "SERVED"].includes(o.status));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Commandes</h1>
          <p className="text-sm text-ink-muted">Gestion en temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              connected
                ? "bg-[color:var(--status-good)]/12 text-[color:var(--delta-up)]"
                : "bg-critical/10 text-critical"
            )}
          >
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? "Temps réel actif" : "Reconnexion…"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundOn((s) => !s)}
            aria-pressed={soundOn}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Son
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Aucune commande en cours"
          hint="Les nouvelles commandes apparaîtront ici instantanément."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnOrders = visible.filter((o) => column.status.includes(o.status));
            return (
              <section key={column.title} aria-label={column.title}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                  {column.title}
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                    {columnOrders.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {columnOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      actions={column.next}
                      onAction={(to) => changeStatus(order, to)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  actions,
  onAction,
}: {
  order: Order;
  actions: { to: string; label: string }[];
  onAction: (to: string) => void;
}) {
  return (
    <Card className={cn("p-4", order.status === "NEW" && "pulse-new")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">#{order.number}</p>
          <p className="text-xs text-ink-muted">
            {formatTime(order.createdAt)}
            {order.customerName ? ` · ${order.customerName}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={order.type === "DINE_IN" ? "default" : "brand"}>
            {order.type === "DINE_IN"
              ? order.tableName
                ? `Table ${order.tableName}`
                : "Sur place"
              : ORDER_TYPE_LABELS[order.type]}
          </Badge>
          <Badge variant="outline">{ORDER_STATUS_LABELS[order.status]}</Badge>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-sm">
        {order.items.map((item) => (
          <li key={item.id}>
            <div className="flex justify-between">
              <span>
                <span className="font-medium">{item.quantity}×</span> {item.productName}
              </span>
              <span className="text-ink-secondary">{formatCurrency(item.totalPrice)}</span>
            </div>
            {item.options?.length ? (
              <p className="text-xs text-ink-muted">
                {item.options.map((o) => o.choice).join(" · ")}
              </p>
            ) : null}
            {item.comment ? <p className="text-xs italic text-ink-muted">« {item.comment} »</p> : null}
          </li>
        ))}
      </ul>
      {order.note ? <p className="mt-2 text-xs italic text-ink-muted">Note : {order.note}</p> : null}
      <p className="mt-2 flex justify-between border-t border-hairline pt-2 text-sm font-semibold">
        <span>Total</span>
        <span>{formatCurrency(order.totalAmount)}</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {actions
          .filter((a) => a.to !== order.status)
          .map((action) => (
            <Button
              key={action.to}
              size="sm"
              variant={
                action.to === "CANCELLED" ? "ghost" : action.to === "READY" || action.to === "COMPLETED" ? "brand" : "outline"
              }
              className={action.to === "CANCELLED" ? "text-critical" : undefined}
              onClick={() => onAction(action.to)}
            >
              {action.label}
            </Button>
          ))}
      </div>
    </Card>
  );
}
