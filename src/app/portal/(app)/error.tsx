"use client";

import { useEffect } from "react";

// Error boundary portal. Pesan sengaja generik: detail error (yang bisa
// memuat nama tabel/kolom atau data lain) tidak boleh sampai ke klien.
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[portal] unhandled error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="rounded-lg border border-border bg-background p-8 text-center">
      <h2 className="text-base font-semibold text-foreground">Terjadi kendala saat memuat halaman</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Silakan coba lagi. Jika masalah berlanjut, hubungi kantor notaris.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Coba lagi
      </button>
    </div>
  );
}
