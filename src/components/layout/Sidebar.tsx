"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { OPEN_SEARCH_EVENT } from "./TopBarSearch";
import { useT } from "@/components/i18n/LocaleProvider";
import type { NavIconKey, NavSectionConfig } from "@/lib/navigation";
import {
  LayoutDashboard,
  Users,
  DoorOpen,
  ListChecks,
  Calendar,
  Clock,
  FileText,
  Archive,
  BookOpen,
  Wallet,
  BarChart3,
  Shield,
  Sparkles,
  PenLine,
  FileCheck2,
  Stamp,
  ScrollText,
  Bell,
  Menu,
  Search,
  X,
  CalendarCheck,
  Database,
  Map as MapIcon,
  Building2
} from "lucide-react";
import { usePhrase } from "@/components/i18n/LocaleProvider";

// Pemetaan key ikon (string, aman dikirim server -> klien) ke komponen lucide.
const ICONS: Record<NavIconKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  bell: Bell,
  users: Users,
  door: DoorOpen,
  "list-checks": ListChecks,
  calendar: Calendar,
  clock: Clock,
  "file-text": FileText,
  archive: Archive,
  "book-open": BookOpen,
  "file-check": FileCheck2,
  stamp: Stamp,
  scroll: ScrollText,
  wallet: Wallet,
  "bar-chart": BarChart3,
  shield: Shield,
  sparkles: Sparkles,
  "file-pen": PenLine,
  "calendar-check": CalendarCheck,
  database: Database,
  map: MapIcon,
  building: Building2
};

const OPEN_MENU_EVENT = "nexora:open-menu";

/** Tombol garis tiga di bilah atas (HP/tablet); membuka laci menu Sidebar. */
export function MobileMenuButton() {
  const t = useT();
  return (
    <button
      type="button"
      aria-label={t("nav.openMenu")}
      onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}
      className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

interface SidebarProps {
  /**
   * Section menu yang SUDAH difilter sesuai permission user oleh layout
   * (server component, lewat filterNavSections). Komponen ini tidak
   * mengambil keputusan hak akses sendiri -- hanya merender.
   */
  sections: NavSectionConfig[];
}

/**
 * Layar lebar: sidebar tetap di kiri. Layar kecil (HP/tablet): tombol menu di
 * kiri atas membuka laci menu; laci tertutup otomatis saat berpindah halaman.
 */
export function Sidebar({ sections }: SidebarProps) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; startX: number; x: number; hist: { x: number; t: number }[]; active: boolean } | null>(null);

  /** Tutup laci: keluar lewat jalur masuknya (ke kiri), lalu lepas dari DOM. */
  const closeDrawer = useCallback(() => {
    if (!open || closing) return;
    setClosing(true);
    const panel = panelRef.current;
    const done = () => {
      setOpen(false);
      setClosing(false);
    };
    if (!panel) return done();
    const onEnd = () => {
      panel.removeEventListener("animationend", onEnd);
      done();
    };
    panel.addEventListener("animationend", onEnd);
    window.setTimeout(onEnd, 400); // jaga-jaga bila animasi dimatikan
  }, [open, closing]);
  const pathRef = useRef(pathname);
  useEffect(() => {
    if (pathRef.current !== pathname) {
      pathRef.current = pathname;
      setOpen(false);
      setClosing(false);
    }
  }, [pathname]);
  // Tombol menu ada di bilah atas (MobileMenuButton) dan mengirim event ini.
  useEffect(() => {
    const show = () => {
      setClosing(false);
      setOpen(true);
    };
    window.addEventListener(OPEN_MENU_EVENT, show);
    return () => window.removeEventListener(OPEN_MENU_EVENT, show);
  }, []);

  /* Geser laci 1:1 dengan jari (mengikuti posisi pegang), lalu saat dilepas:
     proyeksikan momentum (rumus deselerasi Apple) -> tutup bila lemparan/posisi
     melewati sepertiga lebar, kalau tidak kembali dengan pegas. */
  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { id: e.pointerId, startX: e.clientX, x: 0, hist: [{ x: e.clientX, t: e.timeStamp }], active: false };
  };
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const panel = panelRef.current;
    if (!d || d.id !== e.pointerId || !panel) return;
    const dx = e.clientX - d.startX;
    d.hist.push({ x: e.clientX, t: e.timeStamp });
    if (d.hist.length > 6) d.hist.shift();
    if (!d.active) {
      if (dx > -10) return; // histeresis 10px sebelum dianggap geser ke kiri
      d.active = true;
      panel.setPointerCapture(e.pointerId);
      panel.classList.add("is-dragging");
      panel.classList.remove("is-settling");
    }
    // ke kanan ditahan (rubber-band), ke kiri 1:1
    const x = dx < 0 ? dx : (dx * 0.25 * 120) / (120 + 0.25 * dx);
    d.x = x;
    panel.style.transform = `translateX(${x}px)`;
  };
  const onDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const panel = panelRef.current;
    drag.current = null;
    if (!d || !panel || !d.active) return;
    panel.classList.remove("is-dragging");
    const a = d.hist[0];
    const b = d.hist[d.hist.length - 1];
    const v = b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0; // px/s
    const project = (v / 1000) * (0.998 / (1 - 0.998));
    const width = panel.offsetWidth;
    const target = d.x + project;
    if (target < -width / 3 || v < -600) {
      panel.style.setProperty("--drawer-x", `translateX(${d.x}px)`);
      panel.style.transform = "";
      closeDrawer();
    } else {
      panel.classList.add("is-settling");
      panel.style.transform = "translateX(0px)";
      window.setTimeout(() => panel.classList.remove("is-settling"), 500);
    }
  };
  // Kunci scroll halaman saat laci menu terbuka.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Dock HP: empat tujuan utama yang tersedia untuk user ini + tombol menu lengkap.
  const DOCK_ORDER = ["/dashboard", "/jobs", "/clients", "/documents", "/payments", "/reports"];
  const allItems = sections.flatMap((s) => s.items);
  const dockItems = DOCK_ORDER.map((href) => allItems.find((i) => i.href === href)).filter((i): i is NavSectionConfig["items"][number] => !!i).slice(0, 4);
  const dockActive = dockItems.findIndex((i) => pathname === i.href || pathname?.startsWith(i.href + "/"));

  return (
    <>
      <div className="hidden h-full lg:flex">
        <SidebarPanel sections={sections} pathname={pathname} />
      </div>
      {/* Dok HP gaya iOS: tab bar kapsul (lensa aktif meluncur antar tab) + tombol menu bulat terpisah */}
      {/* Dok HP gaya iOS: satu kapsul kaca — 4 tujuan utama + Cari; lensa aktif meluncur antar tab */}
      <div className="mobile-dock-wrap">
        <nav
          className="mobile-dock surface"
          aria-label={t("nav.quickNav")}
          style={{ "--n": dockItems.length + 1, "--i": Math.max(0, dockActive) } as CSSProperties}
        >
          {dockActive >= 0 && <span className="dock-lens" aria-hidden="true" />}
          {dockItems.map((item, idx) => {
            const Icon = ICONS[item.icon];
            return (
              <Link key={item.href} href={item.href} aria-label={navLabel(t, item)} aria-current={idx === dockActive ? "page" : undefined} className={idx === dockActive ? "active" : undefined}>
                {Icon && <Icon className="h-[22px] w-[22px]" />}
                <span>{t(`nav.dock.${item.href}`)}</span>
              </Link>
            );
          })}
          <button type="button" aria-label={t("nav.search")} onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}>
            <Search className="h-[22px] w-[22px]" />
            <span>{t("nav.search")}</span>
          </button>
        </nav>
      </div>
      {(open || closing) && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            ref={panelRef}
            className={cn("drawer-panel h-full max-w-[85vw] shadow-xl", closing && "is-closing")}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            <SidebarPanel sections={sections} pathname={pathname} onClose={closeDrawer} />
          </div>
          <button type="button" aria-label={t("nav.closeMenu")} className={cn("drawer-scrim flex-1 bg-black/40", closing && "is-closing")} onClick={closeDrawer} />
        </div>
      )}
    </>
  );
}

/** Label menu sesuai bahasa; bila belum ada terjemahan, pakai label konfigurasi. */
function navLabel(t: ReturnType<typeof useT>, item: { href: string; label: string }): string {
  const v = t(`nav.${item.href}`);
  return v === `nav.${item.href}` ? item.label : v;
}

function SidebarPanel({ sections, pathname, onClose }: { sections: NavSectionConfig[]; pathname: string | null; onClose?: () => void }) {
  const tp = usePhrase();
  const t = useT();
  return (
    <aside className="sidebar-panel surface flex h-full w-64 flex-col rounded-none border-0 border-r border-border shadow-none">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/brand/nexora-tile.png" alt="" className="h-10 w-10 rounded-md" />
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-[0.14em] text-foreground">{tp("NEXORA")}</span>
            <span className="block text-xs text-muted-foreground">{t("nav.tagline")}</span>
          </span>
        </Link>
        {onClose && (
          <button type="button" aria-label={t("nav.closeMenu")} onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-2">
        {sections.map((section, idx) => (
          <div key={section.title ?? `section-${idx}`}>
            {section.title && (
              <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                {t(`nav.sections.${section.title}`)}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = ICONS[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "nav-item flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary-soft font-bold text-primary"
                        : "font-medium text-fg-3 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {Icon && <Icon className="h-[18px] w-[18px] shrink-0" />}
                    {navLabel(t, item)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
