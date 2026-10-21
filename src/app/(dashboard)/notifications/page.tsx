import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { markNotificationRead, markAllNotificationsRead, openNotification } from "@/app/(dashboard)/notifications/actions";
import { notificationHref } from "@/lib/notificationLinks";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  assignment: "Penugasan",
  deadline: "Tenggat",
  overdue: "Terlambat",
  document: "Dokumen",
  info: "Info"
};

interface PageProps {
  searchParams: { filter?: string };
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const filter = searchParams.filter === "unread" ? "unread" : searchParams.filter === "read" ? "read" : "all";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(filter === "unread" ? { isRead: false } : {}),
      ...(filter === "read" ? { isRead: true } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const unreadCount = await prisma.notification.count({ where: { userId: user.id, isRead: false } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifikasi</h1>
          <p className="text-sm text-muted-foreground">{unreadCount} belum dibaca</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Tandai semua dibaca
            </button>
          </form>
        )}
      </div>

      <div className="flex gap-1 rounded-md bg-muted p-1 text-sm w-fit">
        <Link href="/notifications" className={`rounded px-3 py-1 ${filter === "all" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}>
          Semua
        </Link>
        <Link href="/notifications?filter=unread" className={`rounded px-3 py-1 ${filter === "unread" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}>
          Belum Dibaca
        </Link>
        <Link href="/notifications?filter=read" className={`rounded px-3 py-1 ${filter === "read" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}>
          Sudah Dibaca
        </Link>
      </div>

      <Card className="!p-0">
        {notifications.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Tidak ada notifikasi." />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => {
              const href = notificationHref(n.relatedEntityType, n.relatedEntityId);
              return (
                <div key={n.id} className={`flex items-start justify-between gap-3 px-4 py-3 ${!n.isRead ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {TYPE_LABEL[n.type] ?? n.type}
                      </p>
                      {href ? (
                        // Membuka notifikasi = otomatis ditandai dibaca, lalu diarahkan ke halamannya.
                        <form action={openNotification.bind(null, n.id)}>
                          <button type="submit" className="text-left text-sm text-foreground hover:underline">
                            {n.message}
                          </button>
                        </form>
                      ) : (
                        <p className="text-sm text-foreground">{n.message}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </div>
                  {!n.isRead && (
                    <form action={markNotificationRead.bind(null, n.id)}>
                      <button type="submit" className="shrink-0 text-xs font-medium text-primary hover:underline">
                        Tandai dibaca
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
