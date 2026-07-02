"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useApi } from "@/lib/client";
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Input, Select, Spinner, Table, Td, Th } from "@/components/ui";

type Order = {
  id: string;
  number: number;
  customerName: string | null;
  type: string;
  status: string;
  tableName: string | null;
  totalAmount: number;
  createdAt: string;
  items: { id: string; productName: string; quantity: number }[];
};

const STATUS_BADGE: Record<string, "default" | "brand" | "good" | "warning" | "critical" | "outline"> = {
  NEW: "brand",
  ACCEPTED: "default",
  PREPARING: "warning",
  READY: "good",
  SERVED: "good",
  COMPLETED: "outline",
  CANCELLED: "critical",
};

export default function HistoryPage() {
  const [filters, setFilters] = useState({ q: "", status: "", from: "", to: "", table: "" });
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (filters.status) params.set("status", filters.status);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.table) params.set("table", filters.table);
    params.set("page", String(page));
    return params.toString();
  }, [debouncedQ, filters.status, filters.from, filters.to, filters.table, page]);

  const { data, loading } = useApi<{ orders: Order[]; total: number; pageSize: number }>(
    `/api/orders?${query}`
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const set = (key: keyof typeof filters) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Historique</h1>
          <p className="text-sm text-ink-muted">Toutes vos commandes</p>
        </div>
        <a href="/api/export" download>
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Exporter (Excel)
          </Button>
        </a>
      </div>

      {/* Rangée de filtres unique, au-dessus de ce qu'elle filtre */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Recherche (n°, client, produit…)"
          value={filters.q}
          onChange={set("q")}
          className="w-56"
          aria-label="Recherche"
        />
        <Select value={filters.status} onChange={set("status")} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input type="date" value={filters.from} onChange={set("from")} aria-label="Du" />
        <Input type="date" value={filters.to} onChange={set("to")} aria-label="Au" />
        <Input
          placeholder="Table"
          value={filters.table}
          onChange={set("table")}
          className="w-24"
          aria-label="Table"
        />
      </div>

      <Card className="p-0" style={{ opacity: loading && data ? 0.6 : 1 }}>
        {!data ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : data.orders.length === 0 ? (
          <EmptyState title="Aucune commande" hint="Modifiez vos filtres ou attendez vos premières commandes." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>N°</Th>
                <Th>Date</Th>
                <Th>Client</Th>
                <Th>Table</Th>
                <Th>Type</Th>
                <Th>Articles</Th>
                <Th>Statut</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((order) => (
                <tr key={order.id} className="hover:bg-black/2 dark:hover:bg-white/5">
                  <Td className="font-medium">#{order.number}</Td>
                  <Td className="whitespace-nowrap text-ink-secondary">{formatDate(order.createdAt)}</Td>
                  <Td>{order.customerName ?? "—"}</Td>
                  <Td>{order.tableName ?? "—"}</Td>
                  <Td className="text-ink-secondary">{ORDER_TYPE_LABELS[order.type]}</Td>
                  <Td className="max-w-64">
                    <span className="line-clamp-1 text-ink-secondary">
                      {order.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                    </span>
                  </Td>
                  <Td>
                    <Badge variant={STATUS_BADGE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                  </Td>
                  <Td className="text-right font-medium tabular-nums">
                    {formatCurrency(order.totalAmount)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {data && totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-ink-secondary">
          <span>
            {data.total} commande{data.total > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Précédent
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
