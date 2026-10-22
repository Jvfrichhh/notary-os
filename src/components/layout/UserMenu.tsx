"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { KeyRound, LogOut } from "lucide-react";

const ROLE_LABEL: Record<string, string> = { NOTARY: "Notaris", ADMIN: "Admin", STAFF: "Staf", VIEWER: "Pengamat" };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function UserMenu({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="mr-1 flex items-center gap-2.5 rounded-full border border-border py-1 pl-1 pr-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-extrabold text-primary">
          {initials(name)}
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-bold text-foreground">{name}</span>
          <span className="block text-xs text-muted-foreground">{ROLE_LABEL[role] ?? role}</span>
        </span>
      </div>
      <Link
        href="/account/password"
        className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Ganti password"
        aria-label="Ganti password"
      >
        <KeyRound className="h-4 w-4" />
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Keluar"
        aria-label="Keluar"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
