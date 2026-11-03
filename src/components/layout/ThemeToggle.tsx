"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Kunci penyimpanan pilihan tema di browser ("light" | "dark"). */
export const THEME_KEY = "nexora:theme";

/**
 * Dijalankan di <head> sebelum halaman tampil, supaya tidak "berkedip" putih:
 * pakai pilihan tersimpan, bila belum ada ikuti pengaturan perangkat.
 */
export const THEME_COOKIE = "nexora-theme";

/**
 * Server sudah merender class "dark" dari cookie (lihat app/layout.tsx), jadi
 * skrip ini hanya cadangan untuk kunjungan pertama tanpa cookie: ikuti pilihan
 * tersimpan di browser atau pengaturan perangkat, lalu tulis cookie-nya supaya
 * muat ulang berikutnya langsung benar dari server.
 */
export const THEME_INIT_SCRIPT = `try{var d=document.documentElement,c=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(dark|light)/);if(!c){var t=localStorage.getItem("${THEME_KEY}");if(t!=="dark"&&t!=="light")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.classList.toggle("dark",t==="dark");document.cookie="${THEME_COOKIE}="+t+";path=/;max-age=31536000;SameSite=Lax"}}catch(e){}`;

function persistTheme(theme: "dark" | "light") {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
  // Cookie dibaca server saat render berikutnya -> tidak pernah "balik ke terang" setelah muat ulang.
  document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=31536000;SameSite=Lax${location.protocol === "https:" ? ";Secure" : ""}`;
}

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
    persistTheme(next ? "dark" : "light");
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
