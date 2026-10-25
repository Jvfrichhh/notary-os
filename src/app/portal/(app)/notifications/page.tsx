import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/portalSession";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { markAllClientNotificationsRead, markClientNotificationRead, openClientNotification } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalNotificationsPage() {
  const { clientId } = await requireClientAccount();

  const notifications = await prisma.clientNotification.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Notifikasi</h1>
          <p className="text-sm text-muted-foreground">{unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}</p>
        </div>
        {unread > 0 && (
          <form action={markAllClientNotificationsRead}>
            <button type="submit" className="text-xs font-medium text-primary hover:underline">
              Tandai semua dibaca
            </button>
          </form>
        )}
      </div>

      <Card>
        {notifications.length === 0 ? (
          <EmptyState title="Belum ada notifikasi." />
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => {
              const href = n.relatedEntityType === "Job" && n.relatedEntityId ? `/portal/jobs/${n.relatedEntityId}` : null;
              return (
                <li key={n.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    {href ? (
                      // Membuka notifikasi = otomatis ditandai dibaca, lalu ke halaman pekerjaan.
                      <form action={openClientNotification.bind(null, n.id)}>
                        <button
                          type="submit"
                          className={`text-left hover:underline ${n.isRead ? "text-muted-foreground" : "font-medium text-foreground"}`}
                        >
                          {n.message}
                        </button>
                      </form>
                    ) : (
                      <p className={n.isRead ? "text-muted-foreground" : "font-medium text-foreground"}>{n.message}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <form action={markClientNotificationRead.bind(null, n.id)}>
                      <button type="submit" className="whitespace-nowrap text-xs text-muted-foreground hover:text-foreground">
                        Tandai dibaca
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
