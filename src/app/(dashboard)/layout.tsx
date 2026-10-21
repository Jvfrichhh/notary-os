import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SessionWatcher } from "@/components/layout/SessionWatcher";
import { requireUser } from "@/lib/session";
import { getUserPermissions } from "@/lib/permissions";
import { filterNavSections, NAV_SECTIONS } from "@/lib/navigation";
import { isAiEnabled } from "@/lib/ai/client";

// Layout membaca session -> selalu dinamis (tidak boleh di-cache lintas user).
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Middleware sudah menjamin user login; requireUser() hanya fallback aman.
  const user = await requireUser();

  // Permission diambil SEKALI di sini (satu query) lalu dipakai untuk
  // menyaring menu. Komponen Sidebar menerima hasil yang sudah bersih,
  // sehingga daftar menu tidak pernah berbeda-beda antar komponen.
  const permissions = await getUserPermissions(user.id);
  const sections = filterNavSections(NAV_SECTIONS, permissions, { aiEnabled: isAiEnabled() });

  return (
    <div className="flex h-screen overflow-hidden bg-muted">
      <SessionWatcher />
      <Sidebar sections={sections} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
