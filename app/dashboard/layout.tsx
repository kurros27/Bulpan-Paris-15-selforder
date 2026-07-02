import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      role: true,
      restaurant: { select: { id: true, name: true, slug: true, darkMode: true, status: true } },
    },
  });
  if (!user?.restaurant) redirect("/login");

  return (
    <DashboardShell
      user={{ name: user.name, role: user.role }}
      restaurant={{
        name: user.restaurant.name,
        slug: user.restaurant.slug,
        darkMode: user.restaurant.darkMode,
      }}
    >
      {children}
    </DashboardShell>
  );
}
