"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  History,
  UtensilsCrossed,
  Trophy,
  LineChart,
  QrCode,
  Bell,
  Settings,
  FileText,
  LogOut,
  Menu as MenuIcon,
  X,
  ExternalLink,
  Moon,
  Sun,
} from "lucide-react";
import { api, useApi } from "@/lib/client";
import { cn, ROLE_LABELS } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/commandes", label: "Commandes", icon: ClipboardList },
  { href: "/dashboard/historique", label: "Historique", icon: History },
  { href: "/dashboard/carte", label: "Carte", icon: UtensilsCrossed },
  { href: "/dashboard/produits", label: "Meilleures ventes", icon: Trophy },
  { href: "/dashboard/statistiques", label: "KPI & statistiques", icon: LineChart },
  { href: "/dashboard/qrcodes", label: "QR Codes", icon: QrCode },
  { href: "/dashboard/rapports", label: "Rapports", icon: FileText },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];

export function DashboardShell({
  user,
  restaurant,
  children,
}: {
  user: { name: string; role: string };
  restaurant: { name: string; slug: string; darkMode: boolean };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(restaurant.darkMode);
  const { data: notifData, mutate } = useApi<{ unreadCount: number }>("/api/notifications?unread=1");

  useEffect(() => {
    const interval = setInterval(mutate, 30000);
    return () => clearInterval(interval);
  }, [mutate]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Navigation principale">
      {NAV.map((item) => {
        const active =
          item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand/10 text-brand"
                : "text-ink-secondary hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
            )}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
            {item.label}
            {item.href === "/dashboard/notifications" && (notifData?.unreadCount ?? 0) > 0 ? (
              <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                {notifData!.unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
    <div className="border-t border-hairline p-3">
      <a
        href={`/menu/${restaurant.slug}`}
        target="_blank"
        rel="noreferrer"
        className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-secondary hover:bg-black/5 dark:hover:bg-white/10"
      >
        <ExternalLink className="h-4 w-4" aria-hidden />
        Voir mon menu
      </a>
      <div className="flex items-center justify-between px-3 py-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-xs text-ink-muted">{ROLE_LABELS[user.role] ?? user.role}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDark((d) => !d)}
            className="rounded-lg p-2 text-ink-muted hover:text-ink"
            aria-label={dark ? "Mode clair" : "Mode sombre"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-ink-muted hover:text-critical"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn(dark && "dark")}>
      <div className="flex min-h-screen bg-page text-ink">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r border-hairline bg-surface lg:flex">
          <div className="border-b border-hairline px-5 py-4">
            <p className="flex items-center gap-2 font-bold">
              <QrCode className="h-5 w-5 text-brand" aria-hidden />
              <span className="truncate">{restaurant.name}</span>
            </p>
          </div>
          {nav}
          {sidebarFooter}
        </aside>

        {/* Sidebar mobile */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="w-72 max-w-[85vw] bg-surface shadow-xl">
              <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
                <p className="font-bold">{restaurant.name}</p>
                <button onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" className="p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex h-[calc(100%-53px)] flex-col">
                {nav}
                {sidebarFooter}
              </div>
            </div>
            <button
              className="flex-1 bg-black/50"
              onClick={() => setMobileOpen(false)}
              aria-label="Fermer"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Barre supérieure mobile */}
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-hairline bg-surface px-4 py-3 lg:hidden">
            <button onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" className="p-1">
              <MenuIcon className="h-5 w-5" />
            </button>
            <p className="truncate font-semibold">{restaurant.name}</p>
            <Link href="/dashboard/notifications" className="relative ml-auto p-1" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {(notifData?.unreadCount ?? 0) > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand" />
              ) : null}
            </Link>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
