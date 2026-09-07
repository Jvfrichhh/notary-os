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
    <Link href="/notifications" className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-overdue text-[10px] font-medium text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
