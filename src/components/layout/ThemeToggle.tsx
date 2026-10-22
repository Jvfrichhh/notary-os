"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Kunci penyimpanan pilihan tema di browser ("light" | "dark"). */
export const THEME_KEY = "nexora:theme";

/**
 * Dijalankan di <head> sebelum halaman tampil, supaya tidak "berkedip" putih:
 * pakai pilihan tersimpan, bila belum ada ikuti pengaturan perangkat.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

/** Tombol ganti mode terang / gelap. Pilihan diingat di browser ini. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* penyimpanan browser tidak tersedia: pilihan berlaku untuk halaman ini saja */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={dark ? "Mode terang" : "Mode gelap"}
      className={`flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
