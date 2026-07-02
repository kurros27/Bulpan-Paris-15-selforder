import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "QRServe — Commande par QR Code pour restaurants",
    template: "%s · QRServe",
  },
  description:
    "Plateforme SaaS de prise de commandes par QR Code : menu digital, commandes en temps réel, statistiques et exports Excel pour votre restaurant.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
