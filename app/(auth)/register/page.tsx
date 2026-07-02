"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Input, Label } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ restaurantName: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/register", { method: "POST", json: form });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'inscription");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Créer votre espace</h1>
        <p className="text-sm text-ink-muted">Votre restaurant en ligne en 2 minutes</p>
      </div>
      {error ? (
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <Label htmlFor="restaurantName">Nom du restaurant</Label>
        <Input id="restaurantName" required minLength={2} value={form.restaurantName} onChange={set("restaurantName")} />
      </div>
      <div>
        <Label htmlFor="name">Votre nom</Label>
        <Input id="name" required minLength={2} autoComplete="name" value={form.name} onChange={set("name")} />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
      </div>
      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
        />
        <p className="mt-1 text-xs text-ink-muted">8 caractères minimum</p>
      </div>
      <Button type="submit" variant="brand" className="w-full" disabled={loading}>
        {loading ? "Création…" : "Créer mon restaurant"}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-brand hover:opacity-80">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
