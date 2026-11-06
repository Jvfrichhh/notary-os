"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { useT } from "@/components/i18n/LocaleProvider";

export const OPEN_SEARCH_EVENT = "nexora:open-search";

/**
 * Kotak pencarian di bilah atas. Layar lebar: selalu tampil. HP: tersembunyi,
 * muncul di tempat yang sama saat tab Cari di dok bawah ditekan (mengembang
 * dari bawah, langsung fokus); tutup dengan X / Esc / pindah halaman.
 */
export function TopBarSearch() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();
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
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);
  return (
    <>
      <GlobalSearchBar className="hidden lg:block" />
      {open ? (
        <div className="glass-pop flex min-w-0 flex-1 items-center gap-1.5 lg:hidden" style={{ "--pop-origin": "bottom center" } as React.CSSProperties}>
          <GlobalSearchBar autoFocus className="max-w-none" />
          <button type="button" aria-label={t("common.close")} onClick={() => setOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <span className="flex-1 lg:hidden" />
      )}
    </>
  );
}
