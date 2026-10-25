"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { KeyRound, LogOut } from "lucide-react";

const ROLE_LABEL: Record<string, string> = { NOTARY: "Notaris", ADMIN: "Admin", STAFF: "Staf", VIEWER: "Pengamat" };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const ICON_BTN =
  "flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground";

/**
 * Laptop/PC: chip nama + tombol Ganti password & Keluar berjajar.
 * HP: cukup bulatan inisial; ketuk untuk membuka menu kecil berisi nama,
 * peran, Ganti password, dan Keluar (agar bilah atas tidak sesak).
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
    <>
      {/* HP */}
      <div ref={ref} className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Menu akun ${name}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-primary-soft text-xs font-extrabold text-primary"
        >
          {initials(name)}
        </button>
        {open && (
          <div role="menu" className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-border bg-background p-2 shadow-lg">
            <div className="border-b border-border px-2 pb-2">
              <p className="truncate text-sm font-bold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <Link
              href="/account/password"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm text-fg-2 hover:bg-muted"
            >
              <KeyRound className="h-4 w-4" /> Ganti password
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2.5 text-left text-sm text-fg-2 hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        )}
      </div>

      {/* Laptop / PC */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <div className="mr-1 flex items-center gap-2.5 rounded-full border border-border py-1 pl-1 pr-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-extrabold text-primary">
            {initials(name)}
          </span>
          <span className="hidden leading-tight md:block">
            <span className="block text-sm font-bold text-foreground">{name}</span>
            <span className="block text-xs text-muted-foreground">{roleLabel}</span>
          </span>
        </div>
        <Link href="/account/password" className={ICON_BTN} title="Ganti password" aria-label="Ganti password">
          <KeyRound className="h-4 w-4" />
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className={ICON_BTN} title="Keluar" aria-label="Keluar">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
