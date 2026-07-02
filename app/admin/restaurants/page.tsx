"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { formatCurrency, formatDate, PLAN_LABELS } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Input, Select, Spinner, Table, Td, Th } from "@/components/ui";

type Restaurant = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  status: "ACTIVE" | "SUSPENDED";
  plan: string;
  monthlyFee: number;
  totalRevenue: number;
  createdAt: string;
  _count: { orders: number; users: number; products: number };
};

export default function AdminRestaurantsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const { data: restaurants, mutate, loading } = useApi<Restaurant[]>(
    `/api/admin/restaurants${debouncedQ ? `?q=${encodeURIComponent(debouncedQ)}` : ""}`
  );

  async function update(id: string, json: Record<string, unknown>) {
    await api(`/api/admin/restaurants/${id}`, { method: "PATCH", json });
    mutate();
  }

  async function remove(restaurant: Restaurant) {
    if (
      !confirm(
        `Supprimer définitivement « ${restaurant.name} » (${restaurant._count.orders} commandes, ${restaurant._count.users} utilisateurs) ? Cette action est irréversible.`
      )
    )
      return;
    await api(`/api/admin/restaurants/${restaurant.id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Restaurants</h1>
        <p className="text-sm text-ink-muted">Gestion des espaces et des abonnements</p>
      </div>

      <Input
        placeholder="Rechercher (nom, slug, e-mail)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-72"
        aria-label="Recherche"
      />

      {!restaurants ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : restaurants.length === 0 ? (
        <EmptyState title="Aucun restaurant" />
      ) : (
        <Card className="p-0" style={{ opacity: loading ? 0.6 : 1 }}>
          <Table>
            <thead>
              <tr>
                <Th>Restaurant</Th>
                <Th>Statut</Th>
                <Th>Abonnement</Th>
                <Th className="text-right">Tarif/mois</Th>
                <Th className="text-right">Commandes</Th>
                <Th className="text-right">CA généré</Th>
                <Th>Créé le</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {restaurants.map((restaurant) => (
                <tr key={restaurant.id} className="hover:bg-black/2 dark:hover:bg-white/5">
                  <Td>
                    <p className="font-medium">{restaurant.name}</p>
                    <a
                      href={`/menu/${restaurant.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
                    >
                      /menu/{restaurant.slug}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </Td>
                  <Td>
                    <button
                      onClick={() =>
                        update(restaurant.id, {
                          status: restaurant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                        })
                      }
                      title={restaurant.status === "ACTIVE" ? "Suspendre" : "Réactiver"}
                    >
                      <Badge variant={restaurant.status === "ACTIVE" ? "good" : "critical"}>
                        {restaurant.status === "ACTIVE" ? "Actif" : "Suspendu"}
                      </Badge>
                    </button>
                  </Td>
                  <Td>
                    <Select
                      value={restaurant.plan}
                      onChange={(e) => update(restaurant.id, { plan: e.target.value })}
                      aria-label={`Abonnement de ${restaurant.name}`}
                    >
                      {Object.entries(PLAN_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td className="text-right">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      defaultValue={restaurant.monthlyFee}
                      className="w-20 text-right"
                      onBlur={(e) => {
                        const fee = Number(e.target.value);
                        if (fee !== restaurant.monthlyFee) update(restaurant.id, { monthlyFee: fee });
                      }}
                      aria-label={`Tarif mensuel de ${restaurant.name}`}
                    />
                  </Td>
                  <Td className="text-right tabular-nums">{restaurant._count.orders}</Td>
                  <Td className="text-right font-medium tabular-nums">
                    {formatCurrency(restaurant.totalRevenue)}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-secondary">{formatDate(restaurant.createdAt)}</Td>
                  <Td>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(restaurant)}
                      aria-label={`Supprimer ${restaurant.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-critical" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
