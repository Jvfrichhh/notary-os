"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyThemeSmoothly, persistGlass, persistTheme } from "@/components/layout/ThemeToggle";
import { useT } from "@/components/i18n/LocaleProvider";
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
  const t = useT();
  function choose(next: boolean) {
    setDark(next);
    applyThemeSmoothly(() => {
      document.documentElement.classList.toggle("dark", next);
      persistTheme(next ? "dark" : "light");
    });
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
    { value: "clear", label: t("settings.glassClear"), hint: t("settings.glassClearHint") },
    { value: "regular", label: t("settings.glassRegular"), hint: t("settings.glassRegularHint") },
    { value: "solid", label: t("settings.glassSolid"), hint: t("settings.glassSolidHint") }
  ];
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">{t("settings.mode")}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {opt(false, t("settings.light"), Sun, t("settings.lightHint"))}
          {opt(true, t("settings.dark"), Moon, t("settings.darkHint"))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">{t("settings.glassLevel")}</p>
        <div role="radiogroup" aria-label={t("settings.glassLevel")} className="surface-2 inline-flex w-full rounded-full p-1 sm:w-auto">
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
        <p className="mt-2 text-xs text-muted-foreground">{t("settings.glassNote")}</p>
      </div>
    </div>
  );
}
