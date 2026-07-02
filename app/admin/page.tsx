"use client";

import { useApi } from "@/lib/client";
import { formatCurrency, PLAN_LABELS } from "@/lib/utils";
import { Card, CardTitle, Spinner } from "@/components/ui";
import { RevenueAreaChart } from "@/components/charts";

type AdminStats = {
  restaurants: number;
  activeRestaurants: number;
  suspendedRestaurants: number;
  users: number;
  ordersMonth: number;
  gmvMonth: number;
  platformRevenue: number;
  plans: { plan: string; count: number; fees: number }[];
  ordersByDay: { day: string; orders: number; revenue: number }[];
};

export default function AdminOverviewPage() {
  const { data } = useApi<AdminStats>("/api/admin/stats");

  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const tiles = [
    { label: "Restaurants", value: String(data.restaurants) },
    { label: "Actifs", value: String(data.activeRestaurants) },
    { label: "Suspendus", value: String(data.suspendedRestaurants) },
    { label: "Utilisateurs", value: String(data.users) },
    { label: "Commandes (mois)", value: data.ordersMonth.toLocaleString("fr-FR") },
    { label: "Volume d'affaires (mois)", value: formatCurrency(data.gmvMonth) },
    { label: "Revenus plateforme (MRR)", value: formatCurrency(data.platformRevenue) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Vue d'ensemble</h1>
        <p className="text-sm text-ink-muted">Statistiques globales de la plateforme</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-4">
            <p className="text-xs text-ink-muted">{tile.label}</p>
            <p className="mt-1 text-2xl font-semibold">{tile.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-3">Volume d'affaires des restaurants (30 jours)</CardTitle>
          <RevenueAreaChart data={data.ordersByDay} />
        </Card>
        <Card>
          <CardTitle className="mb-3">Abonnements</CardTitle>
          <ul className="space-y-2">
            {data.plans.map((plan) => (
              <li
                key={plan.plan}
                className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2 text-sm"
              >
                <span className="font-medium">{PLAN_LABELS[plan.plan] ?? plan.plan}</span>
                <span className="text-ink-secondary">
                  {plan.count} resto(s) · {formatCurrency(plan.fees)}/mois
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
