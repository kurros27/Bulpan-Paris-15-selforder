"use client";

import { useState } from "react";
import { Plus, Download, Printer, Share2, Trash2 } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { Button, Card, Dialog, EmptyState, Input, Label, Select, Spinner } from "@/components/ui";

type Table = { id: string; name: string; zone: string | null };
type QrCode = {
  id: string;
  label: string;
  scans: number;
  table: Table | null;
};

export default function QrCodesPage() {
  const { data: qrCodes, mutate } = useApi<QrCode[]>("/api/qrcodes");
  const { data: tables, mutate: mutateTables } = useApi<Table[]>("/api/tables");
  const { data: me } = useApi<{ restaurant: { slug: string } }>("/api/auth/me");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ label: "", tableId: "", newTable: "" });
  const [busy, setBusy] = useState(false);

  const menuUrl = me?.restaurant
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/menu/${me.restaurant.slug}`
    : "";

  async function create() {
    setBusy(true);
    try {
      let tableId = form.tableId || null;
      if (form.newTable.trim()) {
        const table = await api<Table>("/api/tables", {
          method: "POST",
          json: { name: form.newTable.trim() },
        });
        tableId = table.id;
        mutateTables();
      }
      await api("/api/qrcodes", { method: "POST", json: { label: form.label, tableId } });
      setDialog(false);
      setForm({ label: "", tableId: "", newTable: "" });
      mutate();
    } finally {
      setBusy(false);
    }
  }

  async function remove(qr: QrCode) {
    if (!confirm(`Supprimer le QR Code « ${qr.label} » ?`)) return;
    await api(`/api/qrcodes/${qr.id}`, { method: "DELETE" });
    mutate();
  }

  async function share(qr: QrCode) {
    const url = qr.table ? `${menuUrl}?table=${encodeURIComponent(qr.table.name)}` : menuUrl;
    if (navigator.share) {
      await navigator.share({ title: "Menu", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      alert("Lien copié dans le presse-papiers");
    }
  }

  function print(qr: QrCode) {
    const win = window.open(`/api/qrcodes/${qr.id}/image?size=600`, "_blank");
    win?.addEventListener("load", () => win.print());
  }

  if (!qrCodes) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">QR Codes</h1>
          <p className="text-sm text-ink-muted">
            Un QR Code par salle, terrasse ou table — vos clients scannent et accèdent au menu.
          </p>
        </div>
        <Button variant="brand" onClick={() => setDialog(true)}>
          <Plus className="h-4 w-4" />
          Nouveau QR Code
        </Button>
      </div>

      {menuUrl ? (
        <p className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink-secondary">
          Lien du menu : <span className="font-medium text-ink">{menuUrl}</span>
        </p>
      ) : null}

      {qrCodes.length === 0 ? (
        <EmptyState title="Aucun QR Code" hint="Créez votre premier QR Code pour votre salle." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {qrCodes.map((qr) => (
            <Card key={qr.id} className="flex flex-col items-center gap-2 p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qrcodes/${qr.id}/image?size=240`}
                alt={`QR Code ${qr.label}`}
                className="h-32 w-32 rounded-lg bg-white p-1"
                loading="lazy"
              />
              <p className="font-medium">{qr.label}</p>
              <p className="text-xs text-ink-muted">
                {qr.table ? `Table : ${qr.table.name}` : "Menu général"}
              </p>
              <div className="mt-1 flex items-center gap-1">
                <a href={`/api/qrcodes/${qr.id}/image?size=1200`} download={`qr-${qr.label}.png`}>
                  <Button variant="ghost" size="icon" aria-label="Télécharger">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
                <Button variant="ghost" size="icon" onClick={() => print(qr)} aria-label="Imprimer">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => share(qr)} aria-label="Partager">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(qr)} aria-label="Supprimer">
                  <Trash2 className="h-4 w-4 text-critical" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} title="Nouveau QR Code">
        <div className="space-y-3">
          <div>
            <Label htmlFor="qr-label">Libellé</Label>
            <Input
              id="qr-label"
              placeholder="Ex. : Terrasse, Salle, Table 4…"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="qr-table">Associer à une table (optionnel)</Label>
            <Select
              id="qr-table"
              className="w-full"
              value={form.tableId}
              onChange={(e) => setForm({ ...form, tableId: e.target.value, newTable: "" })}
            >
              <option value="">Aucune (menu général)</option>
              {tables?.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                  {table.zone ? ` (${table.zone})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="qr-new-table">…ou créer une nouvelle table</Label>
            <Input
              id="qr-new-table"
              placeholder="Ex. : 12"
              value={form.newTable}
              onChange={(e) => setForm({ ...form, newTable: e.target.value, tableId: "" })}
            />
          </div>
          <Button variant="brand" className="w-full" disabled={busy || !form.label.trim()} onClick={create}>
            Créer le QR Code
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
