import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { ClientForm } from "@/components/clients/ClientForm";
import { createClient } from "@/app/(dashboard)/clients/actions";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const user = await requirePermission(PERMISSIONS.CREATE_CLIENTS);
  const canCreateJobs = await userHasPermission(user.id, PERMISSIONS.CREATE_JOBS);
  const canBill = await userHasPermission(user.id, PERMISSIONS.EDIT_FINANCE);
  let services: { id: string; name: string; category: string | null }[] = [];
  let staff: { id: string; name: string }[] = [];
  if (canCreateJobs) {
    [services, staff] = await Promise.all([
      prisma.serviceType.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
        select: { id: true, name: true, category: true }
      }),
      prisma.user.findMany({
        // PIC = staf pelaksana; notaris sendiri tidak dipilih sebagai PIC.
        where: { isActive: true, role: { name: "STAFF" } },
        orderBy: { name: "asc" },
        select: { id: true, name: true }
      })
    ]);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Tambah Klien</h1>
        <p className="text-sm text-muted-foreground">
          Nomor client{canCreateJobs ? " dan nomor job" : ""} dibuat otomatis saat disimpan.
        </p>
      </div>

      <Card>
        <ClientForm
          action={createClient}
          cancelHref="/clients"
          newJob={canCreateJobs ? { services, staff, withBilling: canBill } : undefined}
        />
      </Card>
    </div>
  );
}
