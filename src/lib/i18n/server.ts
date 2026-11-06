import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale } from "./index";

/** Bahasa pengguna dari cookie (server component / action / route). */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Penerjemah terikat bahasa pengguna, untuk server component. */
export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}
