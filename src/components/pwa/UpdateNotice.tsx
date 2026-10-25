"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

const CURRENT = process.env.APP_VERSION ?? "dev";
const CHECK_EVERY_MS = 5 * 60 * 1000;

/**
 * Pemberitahuan kecil "Versi baru Nexora tersedia" bila ada pembaruan yang naik
 * ke production saat aplikasi sedang terbuka (berguna terutama di aplikasi
 * terpasang yang tidak punya tombol refresh). Dicek tiap 5 menit dan setiap
 * kali jendela kembali difokuskan.
 */
export function UpdateNotice() {
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const { v } = (await res.json()) as { v?: string };
      if (v && v !== "dev" && v !== CURRENT) setLatest(v);
    } catch {
      // offline / jaringan putus: abaikan, coba lagi nanti
    }
  }, []);

  useEffect(() => {
    if (CURRENT === "dev") return;
    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, [check]);

  if (!latest || latest === dismissed) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-background p-3 pl-4 shadow-lg sm:inset-x-auto sm:right-5 sm:bottom-5"
    >
      <RefreshCw className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm text-foreground">
        <span className="font-bold">Versi baru Nexora tersedia.</span>{" "}
        <span className="text-muted-foreground">Simpan pekerjaan dulu bila ada, lalu muat ulang.</span>
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="h-10 shrink-0 rounded-md bg-primary px-3.5 text-sm font-bold text-primary-foreground hover:opacity-90"
      >
        Muat ulang
      </button>
      <button
        type="button"
        aria-label="Nanti saja"
        title="Nanti saja"
        onClick={() => setDismissed(latest)}
        className="flex h-10 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
