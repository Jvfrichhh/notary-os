"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  FileCheck2,
  Stamp,
  ScrollText,
  Bell
} from "lucide-react";

// Pemetaan key ikon (string, aman dikirim server -> client) ke komponen lucide.
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
  shield: Shield
};

interface SidebarProps {
  /**
   * Section menu yang SUDAH difilter sesuai permission user oleh layout
   * (server component, lewat filterNavSections). Komponen ini tidak
   * mengambil keputusan hak akses sendiri -- hanya merender.
   */
  sections: NavSectionConfig[];
}

export function Sidebar({ sections }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="text-sm font-semibold tracking-tight text-foreground">Notary OS</span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section, idx) => (
          <div key={section.title ?? `section-${idx}`}>
            {section.title && (
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
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
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
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
