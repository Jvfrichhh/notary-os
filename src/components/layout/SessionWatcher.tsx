"use client";

import { useEffect } from "react";

/**
 * Memeriksa sesi tiap 20 detik dan saat tab kembali aktif. Bila akun yang
 * sama sudah login di browser lain, sesi ini langsung dikeluarkan tanpa
 * menunggu pengguna berpindah halaman.
 */
export function SessionWatcher() {
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await res.json()) as { user?: { revoked?: boolean } } | null;
        if (data?.user?.revoked) {
          stopped = true;
          window.location.href = "/logout?reason=elsewhere";
        }
      } catch {
        /* jaringan putus: coba lagi pada putaran berikutnya */
      }
    };
    const timer = window.setInterval(check, 20_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);
  return null;
}
