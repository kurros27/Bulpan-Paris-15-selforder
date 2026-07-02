"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Store, Users, ScrollText, LogOut, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/restaurants", label: "Restaurants", icon: Store },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/journal", label: "Journal d'activité", icon: ScrollText },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-page">
      <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r border-hairline bg-surface md:flex">
        <div className="flex items-center gap-2 border-b border-hairline px-5 py-4 font-bold">
          <ShieldCheck className="h-5 w-5 text-brand" aria-hidden />
          Super Admin
        </div>
        <nav className="flex-1 space-y-0.5 p-3" aria-label="Navigation administration">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-ink-secondary hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
                )}
              >
                <item.icon className="h-4.5 w-4.5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-hairline p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-secondary hover:text-critical"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-hairline bg-surface px-4 py-3 md:hidden">
          <ShieldCheck className="h-5 w-5 text-brand" aria-hidden />
          <p className="font-semibold">Super Admin</p>
          <nav className="ml-auto flex gap-1 overflow-x-auto text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded px-2 py-1 text-ink-secondary">
                <item.icon className="h-4.5 w-4.5" aria-label={item.label} />
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
