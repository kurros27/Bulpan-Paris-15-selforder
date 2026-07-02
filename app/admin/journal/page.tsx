"use client";

import { useState } from "react";
import { useApi } from "@/lib/client";
import { formatDate } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Input, Spinner, Table, Td, Th } from "@/components/ui";

type Log = {
  id: string;
  action: string;
  entity: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
  restaurant: { name: string; slug: string } | null;
};

export default function AdminLogsPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page) });
  if (action) query.set("action", action);

  const { data, loading } = useApi<{ logs: Log[]; total: number; pageSize: number }>(
    `/api/admin/logs?${query}`
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Journal d'activité</h1>
        <p className="text-sm text-ink-muted">Historique des actions sur la plateforme</p>
      </div>

      <Input
        placeholder="Filtrer par action (ex. : order, auth, product…)"
        value={action}
        onChange={(e) => {
          setAction(e.target.value);
          setPage(1);
        }}
        className="w-72"
        aria-label="Filtrer par action"
      />

      {!data ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : data.logs.length === 0 ? (
        <EmptyState title="Aucune entrée" />
      ) : (
        <>
          <Card className="p-0" style={{ opacity: loading ? 0.6 : 1 }}>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Action</Th>
                  <Th>Restaurant</Th>
                  <Th>Utilisateur</Th>
                  <Th>Détails</Th>
                  <Th>IP</Th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-black/2 dark:hover:bg-white/5">
                    <Td className="whitespace-nowrap text-ink-secondary">{formatDate(log.createdAt)}</Td>
                    <Td>
                      <Badge variant="outline">{log.action}</Badge>
                    </Td>
                    <Td className="text-ink-secondary">{log.restaurant?.name ?? "—"}</Td>
                    <Td className="text-ink-secondary">{log.user?.name ?? "client"}</Td>
                    <Td className="max-w-64">
                      <span className="line-clamp-1 text-xs text-ink-muted">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </span>
                    </Td>
                    <Td className="text-xs text-ink-muted">{log.ip ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          {totalPages > 1 ? (
            <div className="flex items-center justify-end gap-2 text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </Button>
              <span className="text-ink-secondary">
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
          ) : null}
        </>
      )}
    </div>
  );
}
