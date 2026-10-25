import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SessionWatcher } from "@/components/layout/SessionWatcher";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/motion/NavigationProgress";
import { WELCOME_PENDING_SCRIPT, WelcomeOverlay } from "@/components/motion/WelcomeOverlay";
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
    <div className="flex min-h-screen bg-canvas lg:h-screen lg:overflow-hidden">
      <script dangerouslySetInnerHTML={{ __html: WELCOME_PENDING_SCRIPT }} />
      <WelcomeOverlay name={user.name ?? "Pengguna"} subtitle={user.role === "NOTARY" ? "Notaris & PPAT" : "Staf Kantor Notaris"} />
      <Suspense>
        <NavigationProgress />
      </Suspense>
      <SessionWatcher />
      <Sidebar sections={sections} />
      <div className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 lg:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
