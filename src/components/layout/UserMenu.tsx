"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function UserMenu({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium leading-none text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
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
