"use client";

import { usePathname } from "next/navigation";

/**
 * Konten halaman masuk dengan pegas kecil (naik 10px + fade) setiap pindah
 * rute; key = pathname supaya animasi dipicu ulang. Reduce-motion -> fade saja.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
