"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { persistGlass, persistTheme } from "@/components/layout/ThemeToggle";
import { DEFAULT_GLASS, isGlassLevel, type GlassLevel } from "@/lib/theme";

/** Pilihan mode terang/gelap (disimpan di browser + cookie, dibaca server saat render). */
export function AppearanceSettings() {
  const [dark, setDark] = useState(false);
  const [glass, setGlass] = useState<GlassLevel>(DEFAULT_GLASS);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const g = document.documentElement.dataset.glass;
    if (isGlassLevel(g)) setGlass(g);
  }, []);
  function chooseGlass(level: GlassLevel) {
    setGlass(level);
    persistGlass(level);
  }
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
  const GLASS_OPTS: { value: GlassLevel; label: string; hint: string }[] = [
    { value: "clear", label: "Jernih", hint: "Paling tembus pandang" },
    { value: "regular", label: "Standar", hint: "Seimbang (bawaan)" },
    { value: "solid", label: "Pekat", hint: "Hampir buram, paling mudah dibaca" }
  ];
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Mode</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {opt(false, "Terang", Sun, "Kaca putih di atas latar hijau muda")}
          {opt(true, "Gelap", Moon, "Kaca hijau-hitam, nyaman di malam hari")}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Tingkat kaca</p>
        <div role="radiogroup" aria-label="Tingkat kaca" className="surface-2 inline-flex w-full rounded-full p-1 sm:w-auto">
          {GLASS_OPTS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={glass === o.value}
              title={o.hint}
              onClick={() => chooseGlass(o.value)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${glass === o.value ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Seberapa tembus pandang panel kaca. Bila perangkat menyetel &quot;kurangi transparansi&quot;, panel otomatis buram.</p>
      </div>
    </div>
  );
}
