"use client";

import { useApi } from "@/lib/client";
import { formatCurrency } from "@/lib/utils";
import { Card, CardTitle, Spinner } from "@/components/ui";
import { RevenueAreaChart, HourBarChart, CategoryDonut, SalesHeatmap } from "@/components/charts";
import { TrendingUp, TrendingDown } from "lucide-react";

type Overview = {
  revenue: Record<"today" | "week" | "month", { value: number; evolution: number | null }>;
  orders: {
    today: { value: number; evolution: number | null };
    month: { value: number; evolution: number | null };
    pending: number;
    preparing: number;
    ready: number;
    completed: number;
    cancelled: number;
  };
  averageBasket: number;
  customers: number;
  productsSold: number;
  averagePrepMinutes: number | null;
  cancellationRate: number;
};

type Charts = {
  revenueByDay: { day: string; revenue: number; orders: number }[];
  ordersByHour: { hour: number; orders: number; revenue: number }[];
  byCategory: { category: string; revenue: number; quantity: number }[];
  byType: { type: string; orders: number; revenue: number }[];
  heatmap: { dow: number; hour: number; orders: number }[];
};

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-medium"
      style={{ color: up ? "var(--delta-up)" : "var(--status-critical)" }}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {up ? "+" : ""}
      {value.toLocaleString("fr-FR")} %
    </span>
  );
}

function StatTile({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <div className="mt-0.5 flex items-center gap-2">
        {delta !== undefined ? <Delta value={delta} /> : null}
        {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
      </div>
    </Card>
  );
}

/** Regroupe les catégories au-delà de 5 dans « Autre » (palette jamais cyclée). */
function foldCategories(data: { category: string; revenue: number }[]) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);
  if (sorted.length <= 6) return sorted.map((d) => ({ name: d.category, value: d.revenue }));
  const head = sorted.slice(0, 5).map((d) => ({ name: d.category, value: d.revenue }));
  const other = sorted.slice(5).reduce((sum, d) => sum + d.revenue, 0);
  return [...head, { name: "Autre", value: Math.round(other * 100) / 100 }];
}

export default function DashboardPage() {
  const { data: stats } = useApi<Overview>("/api/stats/overview");
  const { data: charts } = useApi<Charts>("/api/stats/charts?days=30");

  if (!stats) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const dineIn = charts?.byType.find((t) => t.type === "DINE_IN")?.orders ?? 0;
  const takeaway = charts?.byType.find((t) => t.type === "TAKEAWAY")?.orders ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Tableau de bord</h1>
        <p className="text-sm text-ink-muted">Vue d'ensemble en temps réel de votre activité</p>
      </div>

      {/* Chiffre d'affaires */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Chiffre d'affaires du jour"
          value={formatCurrency(stats.revenue.today.value)}
          delta={stats.revenue.today.evolution}
          hint="vs hier"
        />
        <StatTile
          label="Chiffre d'affaires de la semaine"
          value={formatCurrency(stats.revenue.week.value)}
          delta={stats.revenue.week.evolution}
          hint="vs semaine préc."
        />
        <StatTile
          label="Chiffre d'affaires du mois"
          value={formatCurrency(stats.revenue.month.value)}
          delta={stats.revenue.month.evolution}
          hint="vs mois préc."
        />
      </div>

      {/* Commandes du jour */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Commandes (aujourd'hui)" value={String(stats.orders.today.value)} delta={stats.orders.today.evolution} />
        <StatTile label="En attente" value={String(stats.orders.pending)} />
        <StatTile label="En préparation" value={String(stats.orders.preparing)} />
        <StatTile label="Terminées" value={String(stats.orders.completed)} />
      </div>

      {/* KPI mensuels */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <StatTile label="Panier moyen" value={formatCurrency(stats.averageBasket)} hint="ce mois" />
        <StatTile label="Clients" value={String(stats.customers)} hint="ce mois" />
        <StatTile label="Produits vendus" value={String(stats.productsSold)} hint="ce mois" />
        <StatTile
          label="Temps moyen de préparation"
          value={stats.averagePrepMinutes !== null ? `${stats.averagePrepMinutes} min` : "—"}
        />
        <StatTile label="Taux d'annulation" value={`${stats.cancellationRate.toLocaleString("fr-FR")} %`} hint="ce mois" />
      </div>

      {charts ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle className="mb-3">Évolution du chiffre d'affaires (30 jours)</CardTitle>
              <RevenueAreaChart data={charts.revenueByDay} />
            </Card>
            <Card>
              <CardTitle className="mb-3">Commandes par heure (30 jours)</CardTitle>
              <HourBarChart data={charts.ordersByHour} />
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardTitle className="mb-3">Ventes par catégorie</CardTitle>
              {charts.byCategory.length > 0 ? (
                <CategoryDonut data={foldCategories(charts.byCategory)} />
              ) : (
                <p className="py-16 text-center text-sm text-ink-muted">Pas encore de ventes</p>
              )}
            </Card>
            <Card>
              <CardTitle className="mb-3">Sur place / à emporter</CardTitle>
              {dineIn + takeaway > 0 ? (
                <CategoryDonut
                  currency={false}
                  data={[
                    { name: "Sur place", value: dineIn },
                    { name: "À emporter", value: takeaway },
                  ]}
                />
              ) : (
                <p className="py-16 text-center text-sm text-ink-muted">Pas encore de commandes</p>
              )}
            </Card>
            <Card>
              <CardTitle className="mb-3">Affluence (jour × heure)</CardTitle>
              <SalesHeatmap data={charts.heatmap} />
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
