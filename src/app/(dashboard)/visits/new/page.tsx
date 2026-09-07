import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { VisitForm } from "@/components/visits/VisitForm";
import { createVisit } from "@/app/(dashboard)/visits/actions";

export default async function NewVisitPage() {
  await requirePermission(PERMISSIONS.CREATE_VISITS);

  const [clients, staff] = await Promise.all([
    prisma.client.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, clientNumber: true, phone: true }
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Catat Kunjungan</h1>
        <p className="text-sm text-muted-foreground">Untuk klien terdaftar maupun pengunjung baru.</p>
      </div>

      <Card>
        <VisitForm action={createVisit} clients={clients} staff={staff} cancelHref="/visits" />
      </Card>
    </div>
  );
}
