"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

/** Pilihan bahasa tampilan: disimpan di cookie, lalu halaman dirender ulang dari server. */
export function LanguageSettings() {
  const current = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<Locale>(current);
  const OPTS: { value: Locale; label: string; native: string }[] = [
    { value: "id", label: t("settings.languageId"), native: "ID" },
    { value: "en", label: t("settings.languageEn"), native: "EN" }
  ];
  function choose(l: Locale) {
    if (l === chosen) return;
    setChosen(l);
    document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=31536000;SameSite=Lax${location.protocol === "https:" ? ";Secure" : ""}`;
    document.documentElement.lang = l;
    start(() => router.refresh());
  }
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label={t("settings.language")} className="flex flex-col gap-3 sm:flex-row">
        {OPTS.map((o) => {
          const active = chosen === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => choose(o.value)}
              className={`flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${active ? "border-primary bg-primary-soft" : "border-border hover:bg-muted"}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {o.native}
              </span>
              <span className="flex-1 text-sm font-bold text-foreground">{o.label}</span>
              {active ? <Check className="h-4 w-4 text-primary" /> : <Languages className="h-4 w-4 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t("settings.languagePartial")}</p>
    </div>
  );
}
