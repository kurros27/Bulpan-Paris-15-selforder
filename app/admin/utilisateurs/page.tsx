"use client";

import { useEffect, useState } from "react";
import { api, useApi } from "@/lib/client";
import { formatDate, ROLE_LABELS } from "@/lib/utils";
import { Badge, Card, EmptyState, Input, Spinner, Switch, Table, Td, Th } from "@/components/ui";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  restaurant: { name: string; slug: string } | null;
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const { data: users, mutate, loading } = useApi<User[]>(
    `/api/admin/users${debouncedQ ? `?q=${encodeURIComponent(debouncedQ)}` : ""}`
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Utilisateurs</h1>
        <p className="text-sm text-ink-muted">Tous les comptes de la plateforme</p>
      </div>

      <Input
        placeholder="Rechercher (nom, e-mail)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-72"
        aria-label="Recherche"
      />

      {!users ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="Aucun utilisateur" />
      ) : (
        <Card className="p-0" style={{ opacity: loading ? 0.6 : 1 }}>
          <Table>
            <thead>
              <tr>
                <Th>Nom</Th>
                <Th>E-mail</Th>
                <Th>Rôle</Th>
                <Th>Restaurant</Th>
                <Th>Dernière connexion</Th>
                <Th>Actif</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-black/2 dark:hover:bg-white/5">
                  <Td className="font-medium">{user.name}</Td>
                  <Td className="text-ink-secondary">{user.email}</Td>
                  <Td>
                    <Badge variant={user.role === "SUPER_ADMIN" ? "brand" : "outline"}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </Td>
                  <Td className="text-ink-secondary">{user.restaurant?.name ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-ink-secondary">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "jamais"}
                  </Td>
                  <Td>
                    {user.role === "SUPER_ADMIN" ? (
                      <span className="text-xs text-ink-muted">—</span>
                    ) : (
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={async (isActive) => {
                          await api(`/api/admin/users/${user.id}`, { method: "PATCH", json: { isActive } });
                          mutate();
                        }}
                        aria-label={`Activer ${user.name}`}
                      />
                    )}
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
