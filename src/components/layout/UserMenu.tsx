"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { KeyRound, LogOut } from "lucide-react";

export function UserMenu({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium leading-none text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
      <Link
        href="/account/password"
        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Ganti password"
        aria-label="Ganti password"
      >
        <KeyRound className="h-4 w-4" />
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Keluar"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
