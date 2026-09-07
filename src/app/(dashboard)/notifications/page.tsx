import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { markNotificationRead, markAllNotificationsRead } from "@/app/(dashboard)/notifications/actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  assignment: "Penugasan",
  deadline: "Deadline",
  overdue: "Overdue",
  document: "Dokumen",
  info: "Info"
};

// Peta relatedEntityType -> halaman detail yang sudah ada di app ini.
// Cukup ditambah barisnya kalau ada entity baru yang mengirim notifikasi.
function entityHref(type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  switch (type) {
    case "Job":
      return `/jobs/${id}`;
    case "Client":
      return `/clients/${id}`;
    case "Document":
      return `/documents/${id}`;
    case "Deed":
      return `/archive/deed/${id}`;
    case "Minuta":
      return `/archive/minuta/${id}`;
    case "Salinan":
      return `/archive/salinan/${id}`;
    case "Grosse":
      return `/archive/grosse/${id}`;
    case "Kutipan":
      return `/archive/kutipan/${id}`;
    case "Repertorium":
      return `/notary-record/${id}`;
    case "Visit":
      return `/visits/${id}`;
    case "Legalisasi":
      return `/legalisasi/${id}`;
    case "Waarmerking":
      return `/waarmerking/${id}`;
    case "Wasiat":
      return `/wasiat/${id}`;
    default:
      return null;
  }
}

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
              const href = entityHref(n.relatedEntityType, n.relatedEntityId);
              return (
                <div key={n.id} className={`flex items-start justify-between gap-3 px-4 py-3 ${!n.isRead ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {TYPE_LABEL[n.type] ?? n.type}
                      </p>
                      {href ? (
                        <Link href={href} className="text-sm text-foreground hover:underline">
                          {n.message}
                        </Link>
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
