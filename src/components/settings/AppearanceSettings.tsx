"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { persistTheme } from "@/components/layout/ThemeToggle";

/** Pilihan mode terang/gelap (disimpan di browser + cookie, dibaca server saat render). */
export function AppearanceSettings() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function choose(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    persistTheme(next ? "dark" : "light");
  }
  const opt = (value: boolean, label: string, Icon: typeof Sun, hint: string) => (
    <button
      type="button"
      onClick={() => choose(value)}
      aria-pressed={dark === value}
      className={`flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${dark === value ? "border-primary bg-primary-soft" : "border-border hover:bg-muted"}`}
    >
      <Icon className={`h-5 w-5 ${dark === value ? "text-primary" : "text-muted-foreground"}`} />
      <span>
        <span className="block text-sm font-bold text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {opt(false, "Terang", Sun, "Kaca putih di atas latar hijau muda")}
      {opt(true, "Gelap", Moon, "Kaca hijau-hitam, nyaman di malam hari")}
    </div>
  );
}
