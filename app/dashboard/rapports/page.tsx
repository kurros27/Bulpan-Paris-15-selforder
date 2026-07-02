"use client";

import { useState } from "react";
import { FileText, Plus, Trash2, Printer } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Dialog,
  EmptyState,
  Input,
  Label,
  Select,
  Spinner,
  Switch,
} from "@/components/ui";

type Report = {
  id: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  data: {
    revenue: number;
    orders: number;
    averageBasket: number;
    topProducts: { name: string; quantity: number; revenue: number }[];
    leastProducts: { name: string; quantity: number }[];
    recommendations: string[];
  };
};

type Schedule = {
  id: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  email: string;
  enabled: boolean;
};

const FREQ_LABELS = { DAILY: "Quotidien", WEEKLY: "Hebdomadaire", MONTHLY: "Mensuel" };

export default function ReportsPage() {
  const { data: reports, mutate } = useApi<Report[]>("/api/reports");
  const { data: schedules, mutate: mutateSchedules } = useApi<Schedule[]>("/api/reports/schedules");
  const [selected, setSelected] = useState<Report | null>(null);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ frequency: "DAILY", email: "" });
  const [busy, setBusy] = useState(false);

  async function generate(frequency: string) {
    setBusy(true);
    try {
      await api("/api/reports", { method: "POST", json: { frequency } });
      mutate();
    } finally {
      setBusy(false);
    }
  }

  async function createSchedule() {
    setBusy(true);
    try {
      await api("/api/reports/schedules", { method: "POST", json: scheduleForm });
      setScheduleDialog(false);
      setScheduleForm({ frequency: "DAILY", email: "" });
      mutateSchedules();
    } finally {
      setBusy(false);
    }
  }

  if (!reports) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Rapports</h1>
        <p className="text-sm text-ink-muted">
          Rapports quotidiens, hebdomadaires et mensuels avec KPI, meilleures ventes et recommandations
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((frequency) => (
          <Button key={frequency} variant="outline" disabled={busy} onClick={() => generate(frequency)}>
            <FileText className="h-4 w-4" />
            Générer le rapport {FREQ_LABELS[frequency].toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Envoi automatique par e-mail */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Envoi automatique par e-mail</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setScheduleDialog(true)}>
            <Plus className="h-4 w-4" />
            Planifier
          </Button>
        </div>
        {!schedules || schedules.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Aucune planification. Configurez l'envoi automatique de vos rapports.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {schedules.map((schedule) => (
              <li key={schedule.id} className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2 text-sm">
                <Badge variant="brand">{FREQ_LABELS[schedule.frequency]}</Badge>
                <span className="text-ink-secondary">{schedule.email}</span>
                <div className="ml-auto flex items-center gap-2">
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={async (enabled) => {
                      await api(`/api/reports/schedules/${schedule.id}`, { method: "PATCH", json: { enabled } });
                      mutateSchedules();
                    }}
                    aria-label="Activer la planification"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      await api(`/api/reports/schedules/${schedule.id}`, { method: "DELETE" });
                      mutateSchedules();
                    }}
                    aria-label="Supprimer la planification"
                  >
                    <Trash2 className="h-4 w-4 text-critical" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {reports.length === 0 ? (
        <EmptyState title="Aucun rapport généré" hint="Générez votre premier rapport ci-dessus." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.id} className="cursor-pointer p-4 hover:shadow-md" onClick={() => setSelected(report)}>
              <div className="flex items-center justify-between">
                <Badge variant="brand">{FREQ_LABELS[report.frequency]}</Badge>
                <span className="text-xs text-ink-muted">{formatDate(report.createdAt)}</span>
              </div>
              <p className="mt-2 text-lg font-semibold">{formatCurrency(report.data.revenue)}</p>
              <p className="text-xs text-ink-muted">
                {report.data.orders} commande(s) · panier moyen {formatCurrency(report.data.averageBasket)}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Détail d'un rapport (imprimable → PDF via le navigateur) */}
      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Rapport ${FREQ_LABELS[selected.frequency].toLowerCase()}` : ""}
        wide
      >
        {selected ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Période : {formatDate(selected.periodStart)} → {formatDate(selected.periodEnd)}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-hairline p-3">
                <p className="text-xs text-ink-muted">Chiffre d'affaires</p>
                <p className="text-lg font-semibold">{formatCurrency(selected.data.revenue)}</p>
              </div>
              <div className="rounded-lg border border-hairline p-3">
                <p className="text-xs text-ink-muted">Commandes</p>
                <p className="text-lg font-semibold">{selected.data.orders}</p>
              </div>
              <div className="rounded-lg border border-hairline p-3">
                <p className="text-xs text-ink-muted">Panier moyen</p>
                <p className="text-lg font-semibold">{formatCurrency(selected.data.averageBasket)}</p>
              </div>
            </div>
            {selected.data.topProducts.length > 0 ? (
              <div>
                <h3 className="mb-1 text-sm font-semibold">Meilleures ventes</h3>
                <ul className="space-y-1 text-sm text-ink-secondary">
                  {selected.data.topProducts.map((p, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {i + 1}. {p.name}
                      </span>
                      <span>
                        {p.quantity} · {formatCurrency(p.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {selected.data.recommendations.length > 0 ? (
              <div>
                <h3 className="mb-1 text-sm font-semibold">Recommandations</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-ink-secondary">
                  {selected.data.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Imprimer / PDF
              </Button>
              <a href="/api/export" download>
                <Button variant="outline">Exporter les données (Excel)</Button>
              </a>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Dialogue planification */}
      <Dialog open={scheduleDialog} onClose={() => setScheduleDialog(false)} title="Planifier un rapport">
        <div className="space-y-3">
          <div>
            <Label htmlFor="sched-freq">Fréquence</Label>
            <Select
              id="sched-freq"
              className="w-full"
              value={scheduleForm.frequency}
              onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
            >
              <option value="DAILY">Quotidien</option>
              <option value="WEEKLY">Hebdomadaire</option>
              <option value="MONTHLY">Mensuel</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="sched-email">E-mail de destination</Label>
            <Input
              id="sched-email"
              type="email"
              value={scheduleForm.email}
              onChange={(e) => setScheduleForm({ ...scheduleForm, email: e.target.value })}
            />
          </div>
          <Button variant="brand" className="w-full" disabled={busy || !scheduleForm.email} onClick={createSchedule}>
            Enregistrer
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
