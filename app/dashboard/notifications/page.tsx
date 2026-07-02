"use client";

import { Bell, CheckCheck, AlertTriangle, XCircle, FileText } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { cn, formatDate } from "@/lib/utils";
import { Button, Card, EmptyState, Spinner } from "@/components/ui";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
};

const ICONS: Record<string, typeof Bell> = {
  NEW_ORDER: Bell,
  ORDER_CANCELLED: XCircle,
  PRODUCT_UNAVAILABLE: AlertTriangle,
  REPORT_READY: FileText,
};

export default function NotificationsPage() {
  const { data, mutate } = useApi<{ notifications: Notification[]; unreadCount: number }>(
    "/api/notifications"
  );

  async function markAllRead() {
    await api("/api/notifications", { method: "PATCH" });
    mutate();
  }

  if (!data) {
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
          <h1 className="text-xl font-bold">Notifications</h1>
          <p className="text-sm text-ink-muted">
            {data.unreadCount > 0 ? `${data.unreadCount} non lue(s)` : "Tout est à jour"}
          </p>
        </div>
        {data.unreadCount > 0 ? (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </Button>
        ) : null}
      </div>

      {data.notifications.length === 0 ? (
        <EmptyState title="Aucune notification" />
      ) : (
        <Card className="divide-y divide-[color:var(--border-hairline)] p-0">
          {data.notifications.map((notification) => {
            const Icon = ICONS[notification.type] ?? Bell;
            return (
              <div
                key={notification.id}
                className={cn("flex items-start gap-3 px-4 py-3", !notification.isRead && "bg-brand/4")}
              >
                <span
                  className={cn(
                    "mt-0.5 rounded-full p-2",
                    notification.isRead ? "bg-black/5 text-ink-muted dark:bg-white/10" : "bg-brand/10 text-brand"
                  )}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !notification.isRead && "font-semibold")}>
                    {notification.title}
                  </p>
                  {notification.body ? (
                    <p className="text-sm text-ink-secondary">{notification.body}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-ink-muted">{formatDate(notification.createdAt)}</p>
                </div>
                {!notification.isRead ? (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Non lue" />
                ) : null}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
