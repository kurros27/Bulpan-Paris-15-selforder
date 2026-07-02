import Link from "next/link";
import { QrCode, BarChart3, Bell, FileSpreadsheet, Smartphone, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: QrCode,
    title: "QR Codes illimités",
    text: "Un QR Code par salle, terrasse ou table. Vos clients scannent et commandent, sans créer de compte.",
  },
  {
    icon: Bell,
    title: "Commandes en temps réel",
    text: "Chaque commande arrive instantanément en cuisine avec notification sonore et suivi des statuts.",
  },
  {
    icon: BarChart3,
    title: "KPI & statistiques",
    text: "Chiffre d'affaires, panier moyen, heures d'affluence, meilleures ventes : pilotez à la donnée.",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel & intégrations",
    text: "Import de carte, exports mis en forme, API REST pour Google Sheets, Power BI, Zapier ou Make.",
  },
  {
    icon: Smartphone,
    title: "Mobile first",
    text: "Menu rapide et élégant sur smartphone, tableau de bord pensé pour tablette et ordinateur.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurisé",
    text: "Authentification JWT, rôles (admin, manager, serveur), journal d'activité et mots de passe chiffrés.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-bold">
          <QrCode className="h-6 w-6 text-brand" aria-hidden />
          QRServe
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Essayer gratuitement
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
          <p className="mb-4 inline-block rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-ink-secondary">
            La commande à table, réinventée
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Vos clients scannent, commandent.
            <br />
            <span className="text-brand">Vous encaissez, vous pilotez.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-secondary">
            Menu digital par QR Code, commandes en temps réel, tableaux de bord et exports Excel.
            Tout ce qu'il faut pour digitaliser votre restaurant, en quelques minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-brand px-6 py-3 text-base font-medium text-white hover:opacity-90"
            >
              Créer mon restaurant
            </Link>
            <Link
              href="/menu/bulpan-paris-15"
              className="rounded-lg border border-hairline bg-surface px-6 py-3 text-base font-medium hover:bg-page"
            >
              Voir un menu de démo
            </Link>
          </div>
        </section>

        <section className="border-t border-hairline bg-surface py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-hairline bg-page p-6">
                <feature.icon className="mb-3 h-6 w-6 text-brand" aria-hidden />
                <h2 className="mb-1 font-semibold">{feature.title}</h2>
                <p className="text-sm text-ink-secondary">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-ink-muted">
        <p>© {new Date().getFullYear()} QRServe</p>
        <p>Fait pour les restaurateurs</p>
      </footer>
    </div>
  );
}
