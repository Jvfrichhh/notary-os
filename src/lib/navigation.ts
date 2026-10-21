import { PERMISSIONS } from "@/lib/permissionKeys";

/**
 * SATU-SATUNYA sumber kebenaran untuk menu navigasi (sidebar, dan navigasi
 * lain yang mungkin ditambahkan nanti, mis. versi mobile).
 *
 * Setiap item punya aturan `permissions`:
 *   - `undefined`  -> tampil untuk semua user yang sudah login (Dashboard, Notifikasi)
 *   - `[a, b]`     -> tampil kalau user punya MINIMAL SATU dari permission itu
 *
 * Aturan di sini SENGAJA disamakan dengan `requirePermission(...)` di tiap
 * page.tsx. Menyembunyikan menu hanyalah kenyamanan UI; keamanan tetap
 * ditegakkan server-side di halaman, server action, dan API route.
 *
 * File ini bebas dari React/ikon supaya aman di-import dari server component,
 * client component, maupun script pengujian. Ikon dipetakan di Sidebar.tsx
 * lewat `icon` (string key).
 */

export type NavIconKey =
  | "dashboard"
  | "bell"
  | "users"
  | "door"
  | "list-checks"
  | "calendar"
  | "clock"
  | "file-text"
  | "archive"
  | "book-open"
  | "file-check"
  | "stamp"
  | "scroll"
  | "wallet"
  | "bar-chart"
  | "shield"
  | "sparkles"
  | "file-pen";

export interface NavItemConfig {
  label: string;
  href: string;
  icon: NavIconKey;
  /** Salah satu permission ini cukup. Kosongkan (undefined) = semua user login. */
  permissions?: readonly string[];
  /** Hanya tampil bila fitur AI aktif di server (ANTHROPIC_API_KEY diset). */
  requiresAi?: boolean;
}

export interface NavSectionConfig {
  title?: string;
  items: NavItemConfig[];
}

/**
 * Izin yang membuka halaman /admin. Dipakai di konfigurasi menu DAN di
 * admin/page.tsx supaya keduanya tidak pernah berbeda.
 */
export const ADMIN_PAGE_PERMISSIONS: readonly string[] = [
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.MANAGE_ROLES,
  PERMISSIONS.VIEW_AUDIT_LOG
];

// Struktur sesuai Blueprint §4 — Information Architecture / Sidebar.
export const NAV_SECTIONS: NavSectionConfig[] = [
  { items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard" }] },
  { items: [{ label: "Notifikasi", href: "/notifications", icon: "bell" }] },
  {
    title: "CRM",
    items: [
      { label: "Clients", href: "/clients", icon: "users", permissions: [PERMISSIONS.VIEW_CLIENTS] },
      { label: "Visits", href: "/visits", icon: "door", permissions: [PERMISSIONS.VIEW_VISITS] }
    ]
  },
  {
    title: "Work",
    items: [
      { label: "Joblist", href: "/jobs", icon: "list-checks", permissions: [PERMISSIONS.VIEW_JOBS] },
      // Calendar & Deadlines menampilkan data job -> page-nya memakai VIEW_JOBS.
      { label: "Calendar", href: "/calendar", icon: "calendar", permissions: [PERMISSIONS.VIEW_JOBS] },
      { label: "Deadlines", href: "/deadlines", icon: "clock", permissions: [PERMISSIONS.VIEW_JOBS] },
      { label: "Draft Akta", href: "/deeds", icon: "file-pen", permissions: [PERMISSIONS.VIEW_JOBS] },
      // Asisten AI membaca data lewat tool yang masing-masing dibatasi permission;
      // minimal VIEW_JOBS supaya ada yang bisa ditanyakan.
      { label: "Asisten AI", href: "/assistant", icon: "sparkles", permissions: [PERMISSIONS.VIEW_JOBS], requiresAi: true }
    ]
  },
  {
    title: "Documents",
    items: [
      { label: "Document Vault", href: "/documents", icon: "file-text", permissions: [PERMISSIONS.VIEW_DOCUMENTS] }
    ]
  },
  {
    title: "Archive",
    items: [
      {
        label: "Minuta / Salinan / Grosse / Kutipan",
        href: "/archive",
        icon: "archive",
        permissions: [PERMISSIONS.VIEW_MINUTA]
      }
    ]
  },
  {
    title: "Notary Record",
    items: [
      {
        label: "Repertorium / Klapper",
        href: "/notary-record",
        icon: "book-open",
        permissions: [PERMISSIONS.VIEW_REPERTORIUM]
      }
    ]
  },
  {
    title: "Layanan Lain",
    items: [
      { label: "Legalisasi", href: "/legalisasi", icon: "file-check", permissions: [PERMISSIONS.VIEW_LEGALISASI] },
      { label: "Waarmerking", href: "/waarmerking", icon: "stamp", permissions: [PERMISSIONS.VIEW_WAARMERKING] },
      { label: "Wasiat", href: "/wasiat", icon: "scroll", permissions: [PERMISSIONS.VIEW_WASIAT] }
    ]
  },
  {
    title: "Finance",
    items: [{ label: "Payments", href: "/payments", icon: "wallet", permissions: [PERMISSIONS.VIEW_FINANCE] }]
  },
  {
    // Reports berbasis data job (bagian finance di dalamnya sudah di-gate
    // terpisah oleh VIEW_FINANCE di page-nya).
    items: [{ label: "Reports", href: "/reports", icon: "bar-chart", permissions: [PERMISSIONS.VIEW_JOBS] }]
  },
  {
    title: "Admin",
    items: [
      {
        label: "Users, Roles & Audit Log",
        href: "/admin",
        icon: "shield",
        permissions: ADMIN_PAGE_PERMISSIONS
      }
    ]
  }
];

/** True kalau item boleh ditampilkan untuk user dengan kumpulan permission tsb. */
export function canAccessNavItem(item: NavItemConfig, userPermissions: ReadonlySet<string>): boolean {
  if (!item.permissions || item.permissions.length === 0) return true;
  return item.permissions.some((key) => userPermissions.has(key));
}

/**
 * Saring seluruh struktur menu untuk satu user. Section yang semua itemnya
 * tersaring habis ikut dihilangkan (supaya tidak ada judul section kosong).
 */
export function filterNavSections(
  sections: NavSectionConfig[],
  userPermissions: ReadonlySet<string>,
  opts: { aiEnabled?: boolean } = {}
): NavSectionConfig[] {
  const aiEnabled = opts.aiEnabled ?? true;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessNavItem(item, userPermissions) && (aiEnabled || !item.requiresAi))
    }))
    .filter((section) => section.items.length > 0);
}
