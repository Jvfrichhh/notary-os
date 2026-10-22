import { PortalHeader } from "@/components/portal/PortalHeader";
import { requireClientAccount } from "@/lib/portalSession";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/motion/NavigationProgress";
import { WELCOME_PENDING_SCRIPT, WelcomeOverlay } from "@/components/motion/WelcomeOverlay";

// Layout membaca session + database -> selalu dinamis, tidak di-cache lintas klien.
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Satu-satunya pintu masuk area portal: memastikan ini akun klien yang
  // aktif dan terikat ke Client yang aktif. Halaman di bawahnya memanggil
  // requireClientAccount() lagi untuk mendapatkan clientId -- murah, dan
  // menjamin tidak ada halaman yang lupa dibatasi.
  const principal = await requireClientAccount({ allowPendingPasswordChange: true });
  const unreadCount = await prisma.clientNotification.count({
    where: { clientId: principal.clientId, isRead: false }
  });

  return (
    <div className="min-h-screen bg-muted">
      <script dangerouslySetInnerHTML={{ __html: WELCOME_PENDING_SCRIPT }} />
      <WelcomeOverlay name={principal.displayName} subtitle="Portal Klien" />
      <Suspense>
        <NavigationProgress />
      </Suspense>
      <PortalHeader
        displayName={principal.displayName}
        clientNumber={principal.client.clientNumber}
        unreadCount={unreadCount}
      />
      {principal.mustChangePassword && (
        <div className="border-b border-status-due-today/40 bg-status-due-today/10 px-4 py-2 text-center text-sm text-foreground">
          Demi keamanan, silakan ganti password sementara Anda terlebih dahulu.
        </div>
      )}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
