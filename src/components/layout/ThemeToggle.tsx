"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { GLASS_COOKIE, GLASS_KEY, THEME_COOKIE, THEME_KEY, type GlassLevel } from "@/lib/theme";
import { useT } from "@/components/i18n/LocaleProvider";

function persistTheme(theme: "dark" | "light") {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
  // Cookie dibaca server saat render berikutnya -> tidak pernah "balik ke terang" setelah muat ulang.
  document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=31536000;SameSite=Lax${location.protocol === "https:" ? ";Secure" : ""}`;
  document.documentElement.style.colorScheme = theme;
}

/** Simpan tingkat kaca (Jernih/Standar/Pekat) dan terapkan seketika. */
function persistGlass(level: GlassLevel) {
  try {
    localStorage.setItem(GLASS_KEY, level);
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
  document.cookie = `${GLASS_COOKIE}=${level};path=/;max-age=31536000;SameSite=Lax${location.protocol === "https:" ? ";Secure" : ""}`;
  document.documentElement.dataset.glass = level;
}

/**
 * Ganti tema dengan transisi silang (View Transitions) alih-alih lompatan
 * terang/gelap yang menyilaukan; browser lama / reduce-motion langsung ganti.
 */
function applyThemeSmoothly(apply: () => void) {
  const d = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof d.startViewTransition === "function" && !reduce) d.startViewTransition(apply);
  else apply();
}

export { persistTheme, persistGlass, applyThemeSmoothly };

/** Tombol ganti mode terang / gelap. Pilihan diingat di browser ini. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const t = useT();

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    applyThemeSmoothly(() => {
      document.documentElement.classList.toggle("dark", next);
      persistTheme(next ? "dark" : "light");
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t("topbar.toLight") : t("topbar.toDark")}
      title={dark ? t("topbar.toLight") : t("topbar.toDark")}
      className={`flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
