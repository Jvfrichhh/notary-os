"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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

interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

// Struktur sesuai Blueprint §4 — Information Architecture / Sidebar.
// Modul yang belum diimplementasikan di Phase 1 tetap ditampilkan
// (route-nya sementara nunjuk ke halaman placeholder) supaya IA final terlihat utuh.
const SECTIONS: NavSection[] = [
  { items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  { items: [{ label: "Notifikasi", href: "/notifications", icon: Bell }] },
  {
    title: "CRM",
    items: [
      { label: "Clients", href: "/clients", icon: Users },
      { label: "Visits", href: "/visits", icon: DoorOpen }
    ]
  },
  {
    title: "Work",
    items: [
      { label: "Joblist", href: "/jobs", icon: ListChecks },
      { label: "Calendar", href: "/calendar", icon: Calendar },
      { label: "Deadlines", href: "/deadlines", icon: Clock }
    ]
  },
  {
    title: "Documents",
    items: [{ label: "Document Vault", href: "/documents", icon: FileText }]
  },
  {
    title: "Archive",
    items: [{ label: "Minuta / Salinan / Grosse / Kutipan", href: "/archive", icon: Archive }]
  },
  {
    title: "Notary Record",
    items: [{ label: "Repertorium / Klapper", href: "/notary-record", icon: BookOpen }]
  },
  {
    title: "Layanan Lain",
    items: [
      { label: "Legalisasi", href: "/legalisasi", icon: FileCheck2 },
      { label: "Waarmerking", href: "/waarmerking", icon: Stamp },
      { label: "Wasiat", href: "/wasiat", icon: ScrollText }
    ]
  },
  {
    title: "Finance",
    items: [{ label: "Payments", href: "/payments", icon: Wallet }]
  },
  { items: [{ label: "Reports", href: "/reports", icon: BarChart3 }] },
  {
    title: "Admin",
    items: [{ label: "Users, Roles & Audit Log", href: "/admin", icon: Shield }]
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="text-sm font-semibold tracking-tight text-foreground">Notary OS</span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section, idx) => (
          <div key={idx}>
            {section.title && (
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;
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
