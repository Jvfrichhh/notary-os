"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

/**
 * Menghapus cookie sesi lalu kembali ke halaman login. Dipakai saat akun yang
 * sama login di browser lain (sesi ini tidak berlaku lagi).
 */
export default function LogoutPage({ searchParams }: { searchParams: { reason?: string } }) {
  const reason = searchParams.reason === "elsewhere" ? "elsewhere" : "";
  useEffect(() => {
    signOut({ callbackUrl: reason ? `/login?reason=${reason}` : "/login" });
  }, [reason]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted text-sm text-muted-foreground">
      {reason === "elsewhere" ? "Akun Anda baru saja login di perangkat lain. Mengeluarkan sesi ini..." : "Keluar..."}
    </div>
  );
}
