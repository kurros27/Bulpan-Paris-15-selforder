"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useApi } from "@/lib/client";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardTitle, EmptyState, Input, Spinner, Table, Td, Th } from "@/components/ui";

type Ranking = {
  top: { rank: number; name: string; quantity: number; revenue: number; evolution: number | null }[];
  least: { rank: number; name: string; quantity: number; revenue: number }[];
  mostProfitable: { rank: number; name: string; quantity: number; revenue: number }[];
  unavailable: { name: string; price: number }[];
  neverOrdered: { name: string; price: number }[];
};

const PERIODS = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
  { value: "custom", label: "Personnalisée" },
];

export default function ProductsRankingPage() {
  const [period, setPeriod] = useState("month");
  const [range, setRange] = useState({ from: "", to: "" });

  const query = useMemo(() => {
    if (period === "custom" && range.from) {
      const params = new URLSearchParams({ from: range.from });
      if (range.to) params.set("to", range.to);
      return `/api/stats/products?${params}`;
    }
    if (period === "custom") return null;
    return `/api/stats/products?period=${period}`;
  }, [period, range]);

  const { data, loading } = useApi<Ranking>(query);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Meilleures ventes</h1>
        <p className="text-sm text-ink-muted">Classement des produits par période</p>
      </div>

      {/* Rangée de filtres unique */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              period === p.value
                ? "bg-ink text-page"
                : "border border-hairline bg-surface text-ink-secondary hover:text-ink"
            )}
            aria-pressed={period === p.value}
          >
            {p.label}
          </button>
        ))}
        {period === "custom" ? (
          <>
            <Input
              type="date"
              value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
              aria-label="Du"
            />
            <Input
              type="date"
              value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
              aria-label="Au"
            />
          </>
        ) : null}
      </div>

      {!data ? (
        <div className="flex justify-center py-24">{loading ? <Spinner /> : null}</div>
      ) : (
        <div className="space-y-4" style={{ opacity: loading ? 0.6 : 1 }}>
          <Card className="p-0">
            <CardTitle className="px-4 pt-4">Produits les plus vendus</CardTitle>
            {data.top.length === 0 ? (
              <EmptyState title="Aucune vente sur la période" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Rang</Th>
                    <Th>Produit</Th>
                    <Th className="text-right">Quantité vendue</Th>
                    <Th className="text-right">Chiffre d'affaires</Th>
                    <Th className="text-right">Évolution</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.top.map((row) => (
                    <tr key={row.rank} className="hover:bg-black/2 dark:hover:bg-white/5">
                      <Td className="font-semibold">{row.rank}</Td>
                      <Td>{row.name}</Td>
                      <Td className="text-right tabular-nums">{row.quantity}</Td>
                      <Td className="text-right font-medium tabular-nums">{formatCurrency(row.revenue)}</Td>
                      <Td className="text-right">
                        {row.evolution === null ? (
                          <span className="text-ink-muted">nouveau</span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium"
                            style={{
                              color: row.evolution >= 0 ? "var(--delta-up)" : "var(--status-critical)",
                            }}
                          >
                            {row.evolution >= 0 ? (
                              <TrendingUp className="h-3 w-3" aria-hidden />
                            ) : (
                              <TrendingDown className="h-3 w-3" aria-hidden />
                            )}
                            {row.evolution >= 0 ? "+" : ""}
                            {row.evolution.toLocaleString("fr-FR")} %
                          </span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <MiniTable
              title="Produits les moins vendus"
              rows={data.least.map((r) => ({ name: r.name, value: `${r.quantity} vendu(s)` }))}
            />
            <MiniTable
              title="Produits les plus rentables"
              rows={data.mostProfitable.map((r) => ({ name: r.name, value: formatCurrency(r.revenue) }))}
            />
            <MiniTable
              title="Produits en rupture (indisponibles)"
              rows={data.unavailable.map((r) => ({ name: r.name, value: formatCurrency(r.price) }))}
              emptyHint="Aucun produit indisponible"
            />
            <MiniTable
              title="Produits jamais commandés"
              rows={data.neverOrdered.map((r) => ({ name: r.name, value: formatCurrency(r.price) }))}
              emptyHint="Tous vos produits ont déjà été commandés"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniTable({
  title,
  rows,
  emptyHint,
}: {
  title: string;
  rows: { name: string; value: string }[];
  emptyHint?: string;
}) {
  return (
    <Card className="p-0">
      <CardTitle className="px-4 pt-4">{title}</CardTitle>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-muted">{emptyHint ?? "Aucune donnée"}</p>
      ) : (
        <ul className="mt-2 divide-y divide-[color:var(--border-hairline)]">
          {rows.slice(0, 8).map((row, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>{row.name}</span>
              <span className="tabular-nums text-ink-secondary">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
