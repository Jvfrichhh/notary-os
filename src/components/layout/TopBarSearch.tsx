"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { INTL_TAG } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const OPEN_SEARCH_EVENT = "nexora:open-search";

/** Transisi mengikuti kurva pegas yang sama dengan motion lain di aplikasi. */
const SWAP: CSSProperties = { transitionTimingFunction: "var(--spring)", transitionDuration: "var(--spring-dur)" };

/**
 * Bilah atas HP: di keadaan biasa menampilkan tanggal hari ini (hari, tanggal,
 * bulan, tahun). Saat tab Cari di dok bawah ditekan, tanggal menghilang dan
 * kotak pencarian menggantikannya di tempat yang sama (langsung fokus).
 * Tutup dengan X / Esc / pindah halaman. Layar lebar: kotak pencarian selalu tampil.
 */
export function TopBarSearch() {
  const [open, setOpen] = useState(false);
  const [dateText, setDateText] = useState("");
  const pathname = usePathname();
  const t = useT();
  const locale = useLocale();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Tanggal dihitung di klien (zona waktu pengguna), jadi tidak bentrok dengan render server.
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat(INTL_TAG[locale], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    setDateText(fmt.format(new Date()));
  }, [locale]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener(OPEN_SEARCH_EVENT, toggle);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, toggle);
  }, []);
  useEffect(() => {
    // Saat terbuka di HP, ikon-ikon kanan disembunyikan (CSS) supaya kotak pencarian lega.
    const header = document.querySelector<HTMLElement>(".topbar-panel");
    if (header) header.toggleAttribute("data-search-open", open);
    if (!open) return;
    // Fokus manual (bukan autoFocus) karena kotak ini sudah ada sejak awal dan hanya ditampilkan.
    wrapRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <GlobalSearchBar className="hidden lg:block" />
      {/* HP: tanggal dan kotak cari berbagi satu sel grid, jadi saling menggantikan di tempat yang sama. */}
      <div className="grid min-w-0 flex-1 lg:hidden">
        <div
          aria-hidden={open}
          className={cn(
            "col-start-1 row-start-1 flex min-w-0 items-center justify-center truncate text-[15px] font-semibold tracking-tight text-foreground transition-[opacity,transform]",
            open ? "pointer-events-none -translate-y-2 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
          )}
          style={SWAP}
        >
          <span className="truncate">{dateText}</span>
        </div>
        <div
          ref={wrapRef}
          inert={!open}
          className={cn(
            "col-start-1 row-start-1 flex min-w-0 items-center gap-1.5 transition-[opacity,transform]",
            open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-95 opacity-0"
          )}
          style={SWAP}
        >
          <GlobalSearchBar className="max-w-none" />
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}
