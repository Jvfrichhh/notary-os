"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronDown, KeyRound, LogOut, Settings } from "lucide-react";

const ROLE_LABEL: Record<string, string> = { NOTARY: "Notaris", ADMIN: "Admin", STAFF: "Staf", VIEWER: "Pengamat" };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const ITEM = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-fg-2 hover:bg-muted hover:text-foreground";

/**
 * Chip nama di bilah atas (HP: bulatan inisial saja). Ketuk/klik -> menu akun:
 * Pengaturan, Ganti password, Keluar.
 */
export function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const roleLabel = ROLE_LABEL[role] ?? role;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menu akun ${name}`}
        className="press flex items-center gap-2.5 rounded-full border border-border py-1 pl-1 pr-1 hover:bg-muted sm:pr-2.5"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-extrabold text-primary">
          {initials(name)}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-bold text-foreground">{name}</span>
          <span className="block text-xs text-muted-foreground">{roleLabel}</span>
        </span>
        <ChevronDown className={`hidden h-4 w-4 text-muted-foreground transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="surface surface-opaque glass-pop absolute right-0 top-12 z-50 w-60 p-2 shadow-lg">
          <div className="border-b border-border px-2.5 pb-2.5 pt-1">
            <p className="truncate text-sm font-bold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <div className="mt-1.5 space-y-0.5">
            <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className={ITEM}>
              <Settings className="h-4 w-4" /> Pengaturan
            </Link>
            <Link href="/account/password" role="menuitem" onClick={() => setOpen(false)} className={ITEM}>
              <KeyRound className="h-4 w-4" /> Ganti password
            </Link>
            <button type="button" role="menuitem" onClick={() => signOut({ callbackUrl: "/login" })} className={ITEM}>
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
