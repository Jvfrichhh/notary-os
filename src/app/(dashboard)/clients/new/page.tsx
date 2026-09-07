import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { ClientForm } from "@/components/clients/ClientForm";
import { createClient } from "@/app/(dashboard)/clients/actions";

export default async function NewClientPage() {
  await requirePermission(PERMISSIONS.CREATE_CLIENTS);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tambah Client</h1>
        <p className="text-sm text-muted-foreground">Nomor client dibuat otomatis saat disimpan.</p>
      </div>

      <Card>
        <ClientForm action={createClient} cancelHref="/clients" />
      </Card>
    </div>
  );
}
