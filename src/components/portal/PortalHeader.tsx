"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, KeyRound, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { usePhrase } from "@/components/i18n/LocaleProvider";

export function PortalHeader({
  displayName,
  clientNumber,
  unreadCount
}: {
  displayName: string;
  clientNumber: string;
  unreadCount: number;
}) {
  const tp = usePhrase();
  return (
    <header className="portal-top surface sticky top-0 z-40 rounded-none border-0 border-b border-border shadow-none">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
          <img src="/brand/nexora-tile.png" alt="" className="h-9 w-9 shrink-0 rounded-md" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-extrabold tracking-[0.12em] text-foreground">{tp("NEXORA")}</span>
            <span className="block truncate text-xs font-medium text-muted-foreground">{tp("Portal Klien")}</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <LanguageToggle />
          <ThemeToggle className="h-11 w-11" />
          <Link
            href="/portal/notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={tp("Notifikasi{0}", [unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""])}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-overdue text-[10px] font-medium text-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/portal/account/password"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={tp("Ganti password")}
            title={tp("Ganti password")}
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
            title={tp("Keluar")}
            aria-label={tp("Keluar")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

/** Ganti bahasa portal (ID/EN): disimpan di cookie yang sama dengan aplikasi kantor, lalu halaman dirender ulang. */
function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const next: Locale = locale === "id" ? "en" : "id";
  const label = next === "en" ? "Switch to English" : "Ganti ke Bahasa Indonesia";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax${location.protocol === "https:" ? ";Secure" : ""}`;
        document.documentElement.lang = next;
        router.refresh();
      }}
      className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-xs font-extrabold text-muted-foreground hover:bg-muted hover:text-foreground"
      title={label}
      aria-label={label}
    >
      {locale.toUpperCase()}
    </button>
  );
}
