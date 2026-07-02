"use client";

import { useState } from "react";
import { Download, Table2 } from "lucide-react";
import { useApi } from "@/lib/client";
import { cn, formatCurrency } from "@/lib/utils";
import { Button, Card, CardTitle, Spinner, Table, Td, Th } from "@/components/ui";
import { RevenueAreaChart, HourBarChart, CategoryDonut, SalesHeatmap } from "@/components/charts";

type Charts = {
  revenueByDay: { day: string; revenue: number; orders: number }[];
  ordersByHour: { hour: number; orders: number; revenue: number }[];
  byCategory: { category: string; revenue: number; quantity: number }[];
  byType: { type: string; orders: number; revenue: number }[];
  heatmap: { dow: number; hour: number; orders: number }[];
};

const RANGES = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
  { days: 365, label: "12 mois" },
];

export default function StatsPage() {
  const [days, setDays] = useState(30);
  const [tableView, setTableView] = useState(false);
  const { data, loading } = useApi<Charts>(`/api/stats/charts?days=${days}`);

  const totalRevenue = data?.revenueByDay.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalOrders = data?.revenueByDay.reduce((s, d) => s + d.orders, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">KPI & statistiques</h1>
          <p className="text-sm text-ink-muted">Analyse détaillée sur la période choisie</p>
        </div>
        <a href="/api/export" download>
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Exporter (Excel)
          </Button>
        </a>
      </div>

      {/* Rangée de filtres unique au-dessus des graphiques */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((range) => (
          <button
            key={range.days}
            onClick={() => setDays(range.days)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              days === range.days
                ? "bg-ink text-page"
                : "border border-hairline bg-surface text-ink-secondary hover:text-ink"
            )}
            aria-pressed={days === range.days}
          >
            {range.label}
          </button>
        ))}
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setTableView((v) => !v)} aria-pressed={tableView}>
          <Table2 className="h-4 w-4" />
          {tableView ? "Vue graphique" : "Vue tableau"}
        </Button>
      </div>

      {!data ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4" style={{ opacity: loading ? 0.6 : 1 }}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-ink-muted">Chiffre d'affaires</p>
              <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-muted">Commandes</p>
              <p className="mt-1 text-2xl font-semibold">{totalOrders.toLocaleString("fr-FR")}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-muted">Panier moyen</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-muted">Produits vendus</p>
              <p className="mt-1 text-2xl font-semibold">
                {data.byCategory.reduce((s, c) => s + c.quantity, 0).toLocaleString("fr-FR")}
              </p>
            </Card>
          </div>

          {tableView ? (
            /* Jumeau tabulaire des graphiques : mêmes données, lisibles sans couleur */
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-0">
                <CardTitle className="px-4 pt-4">Ventes par jour</CardTitle>
                <Table>
                  <thead>
                    <tr>
                      <Th>Jour</Th>
                      <Th className="text-right">CA</Th>
                      <Th className="text-right">Commandes</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenueByDay.map((row) => (
                      <tr key={row.day}>
                        <Td>{row.day}</Td>
                        <Td className="text-right tabular-nums">{formatCurrency(row.revenue)}</Td>
                        <Td className="text-right tabular-nums">{row.orders}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
              <Card className="p-0">
                <CardTitle className="px-4 pt-4">Ventes par catégorie</CardTitle>
                <Table>
                  <thead>
                    <tr>
                      <Th>Catégorie</Th>
                      <Th className="text-right">Quantité</Th>
                      <Th className="text-right">CA</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCategory.map((row) => (
                      <tr key={row.category}>
                        <Td>{row.category}</Td>
                        <Td className="text-right tabular-nums">{row.quantity}</Td>
                        <Td className="text-right tabular-nums">{formatCurrency(row.revenue)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
              <Card className="p-0">
                <CardTitle className="px-4 pt-4">Ventes par heure</CardTitle>
                <Table>
                  <thead>
                    <tr>
                      <Th>Heure</Th>
                      <Th className="text-right">Commandes</Th>
                      <Th className="text-right">CA</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ordersByHour.map((row) => (
                      <tr key={row.hour}>
                        <Td>{row.hour}h</Td>
                        <Td className="text-right tabular-nums">{row.orders}</Td>
                        <Td className="text-right tabular-nums">{formatCurrency(row.revenue)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
              <Card className="p-0">
                <CardTitle className="px-4 pt-4">Répartition des commandes</CardTitle>
                <Table>
                  <thead>
                    <tr>
                      <Th>Type</Th>
                      <Th className="text-right">Commandes</Th>
                      <Th className="text-right">CA</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byType.map((row) => (
                      <tr key={row.type}>
                        <Td>{row.type === "DINE_IN" ? "Sur place" : "À emporter"}</Td>
                        <Td className="text-right tabular-nums">{row.orders}</Td>
                        <Td className="text-right tabular-nums">{formatCurrency(row.revenue)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </div>
          ) : (
            <>
              <Card>
                <CardTitle className="mb-3">Évolution du chiffre d'affaires</CardTitle>
                <RevenueAreaChart data={data.revenueByDay} height={300} />
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardTitle className="mb-3">Commandes par heure</CardTitle>
                  <HourBarChart data={data.ordersByHour} />
                </Card>
                <Card>
                  <CardTitle className="mb-3">Répartition des ventes par catégorie</CardTitle>
                  {data.byCategory.length > 0 ? (
                    <CategoryDonut
                      data={(() => {
                        const sorted = [...data.byCategory].sort((a, b) => b.revenue - a.revenue);
                        if (sorted.length <= 6)
                          return sorted.map((d) => ({ name: d.category, value: d.revenue }));
                        return [
                          ...sorted.slice(0, 5).map((d) => ({ name: d.category, value: d.revenue })),
                          {
                            name: "Autre",
                            value: sorted.slice(5).reduce((s, d) => s + d.revenue, 0),
                          },
                        ];
                      })()}
                    />
                  ) : (
                    <p className="py-16 text-center text-sm text-ink-muted">Pas encore de ventes</p>
                  )}
                </Card>
              </div>
              <Card>
                <CardTitle className="mb-3">Heures de forte affluence (jour × heure)</CardTitle>
                <SalesHeatmap data={data.heatmap} />
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
