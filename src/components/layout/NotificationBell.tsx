import { Bell } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Server Component — dijalankan di server supaya data notifikasi
// (termasuk yang sensitif) tidak lewat client-side fetch tanpa auth check.
export async function NotificationBell() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false }
  });

  return (
    <Link href="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Notifikasi">
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] px-1 items-center justify-center rounded-full bg-status-overdue text-[10px] font-medium text-background">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
