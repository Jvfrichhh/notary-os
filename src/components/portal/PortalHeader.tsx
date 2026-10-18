"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, LogOut } from "lucide-react";

export function PortalHeader({
  displayName,
  clientNumber,
  unreadCount
}: {
  displayName: string;
  clientNumber: string;
  unreadCount: number;
}) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link href="/portal" className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight text-foreground">Notary OS</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Portal Klien</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/notifications"
            className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-overdue text-[10px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <div className="text-right">
            <p className="text-sm font-medium leading-none text-foreground">{displayName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{clientNumber}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/portal/login" })}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Keluar"
            aria-label="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
