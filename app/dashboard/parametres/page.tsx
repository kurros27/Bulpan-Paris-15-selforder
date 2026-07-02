"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, KeyRound } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { cn, ROLE_LABELS } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Dialog,
  Input,
  Label,
  Select,
  Spinner,
  Switch,
  Table,
  Td,
  Th,
  Textarea,
} from "@/components/ui";

type Settings = {
  name: string;
  description: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  defaultVat: number;
  primaryColor: string;
  darkMode: boolean;
  openingHours: Record<string, string> | null;
  socials: Record<string, string> | null;
  slug: string;
  plan: string;
};

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

type ApiKey = { id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string };

const TABS = ["Restaurant", "Équipe", "Intégrations"] as const;
const DAYS = [
  ["monday", "Lundi"],
  ["tuesday", "Mardi"],
  ["wednesday", "Mercredi"],
  ["thursday", "Jeudi"],
  ["friday", "Vendredi"],
  ["saturday", "Samedi"],
  ["sunday", "Dimanche"],
] as const;
const SOCIALS = ["instagram", "facebook", "tiktok", "site web"] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Restaurant");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Paramètres</h1>
        <p className="text-sm text-ink-muted">Restaurant, équipe et intégrations</p>
      </div>
      <div className="flex gap-2 border-b border-hairline" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === t ? "border-brand text-brand" : "border-transparent text-ink-secondary hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Restaurant" ? <RestaurantSettings /> : tab === "Équipe" ? <TeamSettings /> : <IntegrationsSettings />}
    </div>
  );
}

function RestaurantSettings() {
  const { data: settings } = useApi<Settings>("/api/settings");
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (!form) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setSaved(false);
    try {
      await api("/api/settings", {
        method: "PATCH",
        json: {
          name: form.name,
          description: form.description ?? "",
          logoUrl: form.logoUrl ?? "",
          address: form.address ?? "",
          phone: form.phone ?? "",
          email: form.email ?? "",
          currency: form.currency,
          defaultVat: Number(form.defaultVat),
          primaryColor: form.primaryColor,
          darkMode: form.darkMode,
          openingHours: form.openingHours ?? {},
          socials: form.socials ?? {},
        },
      });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <CardTitle>Identité</CardTitle>
        <div>
          <Label htmlFor="s-name">Nom</Label>
          <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="s-desc">Description</Label>
          <Textarea
            id="s-desc"
            rows={2}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="s-logo">Logo (URL)</Label>
          <Input
            id="s-logo"
            type="url"
            placeholder="https://…"
            value={form.logoUrl ?? ""}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="s-color">Couleur de marque</Label>
            <div className="flex items-center gap-2">
              <input
                id="s-color"
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-hairline bg-surface"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                aria-label="Code hexadécimal"
              />
            </div>
          </div>
          <div className="flex items-end gap-2 pb-1.5">
            <Switch
              checked={form.darkMode}
              onCheckedChange={(darkMode) => setForm({ ...form, darkMode })}
              aria-label="Mode sombre"
            />
            <span className="text-sm">Mode sombre</span>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Coordonnées</CardTitle>
        <div>
          <Label htmlFor="s-address">Adresse</Label>
          <Input
            id="s-address"
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="s-phone">Téléphone</Label>
            <Input
              id="s-phone"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="s-email">E-mail</Label>
            <Input
              id="s-email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="s-currency">Devise</Label>
            <Select
              id="s-currency"
              className="w-full"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CHF">CHF</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="s-vat">TVA par défaut (%)</Label>
            <Input
              id="s-vat"
              type="number"
              step="0.1"
              min="0"
              value={form.defaultVat}
              onChange={(e) => setForm({ ...form, defaultVat: Number(e.target.value) })}
            />
          </div>
        </div>
        <div>
          <Label>Réseaux sociaux</Label>
          <div className="space-y-2">
            {SOCIALS.map((social) => (
              <Input
                key={social}
                placeholder={social.charAt(0).toUpperCase() + social.slice(1)}
                value={form.socials?.[social] ?? ""}
                onChange={(e) =>
                  setForm({ ...form, socials: { ...(form.socials ?? {}), [social]: e.target.value } })
                }
                aria-label={social}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-3 lg:col-span-2">
        <CardTitle>Horaires</CardTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DAYS.map(([key, label]) => (
            <div key={key}>
              <Label htmlFor={`h-${key}`}>{label}</Label>
              <Input
                id={`h-${key}`}
                placeholder="Ex. : 11:30-14:30, 18:30-22:30"
                value={form.openingHours?.[key] ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    openingHours: { ...(form.openingHours ?? {}), [key]: e.target.value },
                  })
                }
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-3 lg:col-span-2">
        <Button variant="brand" disabled={busy} onClick={save}>
          {busy ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
        {saved ? <span className="text-sm text-[color:var(--delta-up)]">Enregistré ✓</span> : null}
      </div>
    </div>
  );
}

function TeamSettings() {
  const { data: members, mutate } = useApi<Member[]>("/api/team");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "SERVER" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/team", { method: "POST", json: form });
      setDialog(false);
      setForm({ name: "", email: "", password: "", role: "SERVER" });
      mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (!members) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="brand" onClick={() => setDialog(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un membre
        </Button>
      </div>
      <Card className="p-0">
        <Table>
          <thead>
            <tr>
              <Th>Nom</Th>
              <Th>E-mail</Th>
              <Th>Rôle</Th>
              <Th>Actif</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <Td className="font-medium">{member.name}</Td>
                <Td className="text-ink-secondary">{member.email}</Td>
                <Td>
                  <Select
                    value={member.role}
                    onChange={async (e) => {
                      await api(`/api/team/${member.id}`, { method: "PATCH", json: { role: e.target.value } });
                      mutate();
                    }}
                    aria-label={`Rôle de ${member.name}`}
                  >
                    {(["ADMIN", "MANAGER", "SERVER"] as const).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td>
                  <Switch
                    checked={member.isActive}
                    onCheckedChange={async (isActive) => {
                      await api(`/api/team/${member.id}`, { method: "PATCH", json: { isActive } });
                      mutate();
                    }}
                    aria-label={`Activer ${member.name}`}
                  />
                </Td>
                <Td className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (!confirm(`Supprimer ${member.name} ?`)) return;
                      await api(`/api/team/${member.id}`, { method: "DELETE" });
                      mutate();
                    }}
                    aria-label={`Supprimer ${member.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-critical" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)} title="Ajouter un membre">
        <div className="space-y-3">
          {error ? (
            <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
          ) : null}
          <div>
            <Label htmlFor="m-name">Nom</Label>
            <Input id="m-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="m-email">E-mail</Label>
            <Input
              id="m-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="m-password">Mot de passe</Label>
            <Input
              id="m-password"
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="m-role">Rôle</Label>
            <Select
              id="m-role"
              className="w-full"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="ADMIN">Administrateur</option>
              <option value="MANAGER">Manager</option>
              <option value="SERVER">Serveur</option>
            </Select>
          </div>
          <Button
            variant="brand"
            className="w-full"
            disabled={busy || !form.name || !form.email || form.password.length < 8}
            onClick={create}
          >
            Ajouter
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function IntegrationsSettings() {
  const { data: keys, mutate } = useApi<ApiKey[]>("/api/apikeys");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const result = await api<{ key: string }>("/api/apikeys", { method: "POST", json: { name } });
      setNewKey(result.key);
      setName("");
      mutate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <CardTitle>API REST pour vos outils</CardTitle>
        <p className="text-sm text-ink-secondary">
          Connectez Google Sheets, Power BI, Looker Studio, Power Automate, Zapier ou Make via
          l'API sécurisée par clé. Endpoints disponibles :
        </p>
        <ul className="space-y-1 text-sm text-ink-secondary">
          <li>
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">GET /api/v1/orders</code>{" "}
            — commandes (filtres from/to/status, pagination)
          </li>
          <li>
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">GET /api/v1/products</code>{" "}
            — carte complète
          </li>
          <li>
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">GET /api/v1/summary</code>{" "}
            — KPI + séries pour tableaux de bord (Excel Power Query, Power BI…)
          </li>
        </ul>
        <p className="text-xs text-ink-muted">
          Authentification : en-tête <code>Authorization: Bearer &lt;clé&gt;</code>. Voir docs/API.md.
        </p>
      </Card>

      {newKey ? (
        <Card className="space-y-2 border-brand">
          <CardTitle>Votre nouvelle clé — copiez-la maintenant, elle ne sera plus affichée</CardTitle>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-black/5 px-2 py-1.5 text-xs dark:bg-white/10">{newKey}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(newKey)}
            >
              <Copy className="h-4 w-4" />
              Copier
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <CardTitle>Clés d'API</CardTitle>
        <div className="flex gap-2">
          <Input
            placeholder="Nom de la clé (ex. : Zapier, Power BI…)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button variant="brand" disabled={busy || name.trim().length < 2} onClick={create}>
            <KeyRound className="h-4 w-4" />
            Générer
          </Button>
        </div>
        {keys && keys.length > 0 ? (
          <ul className="space-y-2">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2 text-sm">
                <span className="font-medium">{key.name}</span>
                <Badge variant="outline">{key.prefix}…</Badge>
                <span className="ml-auto text-xs text-ink-muted">
                  {key.lastUsedAt ? "utilisée récemment" : "jamais utilisée"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!confirm(`Révoquer la clé « ${key.name} » ?`)) return;
                    await api(`/api/apikeys/${key.id}`, { method: "DELETE" });
                    mutate();
                  }}
                  aria-label={`Révoquer ${key.name}`}
                >
                  <Trash2 className="h-4 w-4 text-critical" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">Aucune clé pour l'instant.</p>
        )}
      </Card>
    </div>
  );
}
