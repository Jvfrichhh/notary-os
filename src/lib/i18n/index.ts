import { id } from "./id";
import { en } from "./en";
import type { Dict } from "./types";
import { PHRASES_EN } from "./phrases.en";

/**
 * Bahasa tampilan. Modul biasa (tanpa "use client") supaya bisa dipakai server
 * (layout membaca cookie, server component menerjemahkan) dan klien.
 * Pilihan disimpan di cookie `nexora-lang`; bawaan Bahasa Indonesia.
 */
export type Locale = "id" | "en";
export const LOCALES: readonly Locale[] = ["id", "en"];
export const DEFAULT_LOCALE: Locale = "id";
export const LOCALE_COOKIE = "nexora-lang";
export const isLocale = (v: unknown): v is Locale => v === "id" || v === "en";

const DICTS: Record<Locale, Dict> = { id, en };

/** Tag BCP-47 untuk Intl (tanggal/angka). */
export const INTL_TAG: Record<Locale, string> = { id: "id-ID", en: "en-GB" };

function lookup(dict: Dict, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Terjemahkan `key` ("settings.title") dengan variabel `{name}`; jatuh ke Bahasa Indonesia lalu ke key itu sendiri. */
export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const raw = lookup(DICTS[locale], key) ?? lookup(id, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export type Translator = (key: string, vars?: Record<string, string | number>) => string;
export const makeT = (locale: Locale): Translator => (key, vars) => t(locale, key, vars);

/**
 * Terjemahan berbasis frasa: `text` adalah kalimat Bahasa Indonesia, `{0}`, `{1}` diisi dari `vars`.
 * Bahasa Indonesia (atau frasa yang belum diterjemahkan) dikembalikan apa adanya.
 */
export function phrase(locale: Locale, text: string, vars?: readonly unknown[]): string {
  const raw = locale === "en" ? PHRASES_EN[text] ?? text : text;
  if (!vars) return raw;
  return raw.replace(/\{(\d+)\}/g, (m, i: string) => (Number(i) < vars.length ? String(vars[Number(i)] ?? "") : m));
}

export type PhraseTranslator = (text: string, vars?: readonly unknown[]) => string;
export const makeTp = (locale: Locale): PhraseTranslator => (text, vars) => phrase(locale, text, vars);
