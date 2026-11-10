"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeT, makeTp, type Locale, type Translator } from "@/lib/i18n";

const Ctx = createContext<{ locale: Locale; t: Translator }>({ locale: "id", t: makeT("id") });

/** Menyediakan bahasa (dari cookie, dirender server) ke komponen klien. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx).locale;
export const useT = () => useContext(Ctx).t;
/** Penerjemah berbasis frasa (kalimat Indonesia sebagai kunci) untuk komponen klien. */
export function usePhrase() {
  const locale = useContext(Ctx).locale;
  return useMemo(() => makeTp(locale), [locale]);
}
