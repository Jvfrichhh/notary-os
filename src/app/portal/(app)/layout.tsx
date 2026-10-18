import { PortalHeader } from "@/components/portal/PortalHeader";
import { requireClientAccount } from "@/lib/portalSession";

// Layout membaca session + database -> selalu dinamis, tidak di-cache lintas klien.
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Satu-satunya pintu masuk area portal: memastikan ini akun klien yang
  // aktif dan terikat ke Client yang aktif. Halaman di bawahnya memanggil
  // requireClientAccount() lagi untuk mendapatkan clientId -- murah, dan
  // menjamin tidak ada halaman yang lupa dibatasi.
  const principal = await requireClientAccount();

  return (
    <div className="min-h-screen bg-muted">
      <PortalHeader displayName={principal.displayName} clientNumber={principal.client.clientNumber} />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
