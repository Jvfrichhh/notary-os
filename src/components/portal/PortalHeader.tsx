"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, KeyRound, LogOut, ShieldCheck } from "lucide-react";

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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="truncate text-[15px] font-extrabold tracking-tight text-foreground">Portal Klien</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <Link
            href="/portal/notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-overdue text-[10px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/portal/account/password"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Ganti password"
            title="Ganti password"
          >
            <KeyRound className="h-4 w-4" />
          </Link>
          <div className="hidden max-w-[12rem] text-right sm:block">
            <p className="truncate text-sm font-bold leading-none text-foreground">{displayName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{clientNumber}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/portal/login` })}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
