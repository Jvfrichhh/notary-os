"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { useT } from "@/components/i18n/LocaleProvider";

export const OPEN_SEARCH_EVENT = "nexora:open-search";

/**
 * Lembar pencarian di HP: dibuka dari tab Cari di dok bawah, kotak pencarian
 * langsung fokus (keyboard muncul), tutup dengan X / latar / Esc / pindah halaman.
 */
export function MobileSearchSheet() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_SEARCH_EVENT, show);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, show);
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label={t("common.close")} className="drawer-scrim absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="surface surface-opaque glass-pop absolute left-3 right-3 top-3 p-3" style={{ "--pop-origin": "bottom center" } as React.CSSProperties}>
        <div className="flex items-center gap-2">
          <GlobalSearchBar autoFocus className="max-w-none" />
          <button type="button" aria-label={t("common.close")} onClick={() => setOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
