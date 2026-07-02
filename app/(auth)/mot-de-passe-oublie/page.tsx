"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Input, Label } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/auth/forgot-password", { method: "POST", json: { email } });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-lg font-semibold">E-mail envoyé</h1>
        <p className="text-sm text-ink-secondary">
          Si un compte existe pour <strong>{email}</strong>, un lien de réinitialisation vient de
          lui être envoyé.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-brand hover:opacity-80">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Mot de passe oublié</h1>
        <p className="text-sm text-ink-muted">
          Renseignez votre e-mail pour recevoir un lien de réinitialisation.
        </p>
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" variant="brand" className="w-full" disabled={loading}>
        {loading ? "Envoi…" : "Envoyer le lien"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-ink-muted hover:text-ink">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
