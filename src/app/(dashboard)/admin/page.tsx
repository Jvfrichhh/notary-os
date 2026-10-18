import { EmptyState } from "@/components/ui/EmptyState";
import { requireAnyPermission } from "@/lib/session";
import { ADMIN_PAGE_PERMISSIONS } from "@/lib/navigation";

export const dynamic = "force-dynamic";

// Placeholder Phase 1 -- modul ini diimplementasikan penuh di Phase 2-6
// sesuai roadmap blueprint. Route ini sengaja sudah ada supaya
// Information Architecture (sidebar) final terlihat utuh dari awal.
export default async function AdminPage() {
  // Walau masih placeholder, halaman admin hanya boleh dibuka oleh user
  // dengan izin manage_users / manage_roles / view_audit_log -- sama persis
  // dengan aturan yang memunculkan menunya di sidebar (lib/navigation.ts).
  await requireAnyPermission(ADMIN_PAGE_PERMISSIONS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Admin (Users, Roles, Audit Log)</h1>
        <p className="text-sm text-muted-foreground">Modul ini akan diimplementasikan pada phase berikutnya.</p>
      </div>
      <EmptyState title="Belum tersedia di Phase 1." />
    </div>
  );
}
