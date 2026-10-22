"use client";

import { useEffect, useState } from "react";

/**
 * Angka yang "berhitung" dari 0 ke nilainya saat halaman dibuka (±0,9 detik,
 * melambat di akhir). Diam (langsung nilai akhir) bila pengguna memilih
 * "kurangi gerakan" di sistem.
 */
export function CountUp({
  value,
  duration = 900,
  delay = 0,
  className
}: {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || value === 0) {
      setShown(value);
      return;
    }
    let raf = 0;
    // Setelah login ada layar sambutan ±1,5 detik: hitungan mulai sesudahnya.
    const cls = document.documentElement.classList;
    const wait = cls.contains("welcome-active") || cls.contains("welcome-pending") ? 1450 : 0;
    const start = performance.now() + wait + delay;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay]);

  return <span className={className}>{shown.toLocaleString("id-ID")}</span>;
}
