import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { ServiceRecordForm } from "@/components/serviceRecords/ServiceRecordForm";
import { createWaarmerking } from "@/app/(dashboard)/waarmerking/actions";

export default async function NewWaarmerkingPage() {
  await requirePermission(PERMISSIONS.EDIT_WAARMERKING);

  const [clients, users, documents] = await Promise.all([
    prisma.client.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, clientNumber: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.document.findMany({
      where: { status: "ACTIVE" },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, fileName: true, clientId: true },
      take: 300
    })
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Catat Waarmerking</h1>
      </div>
      <Card>
        <ServiceRecordForm
          action={createWaarmerking}
          moduleLabel="Waarmerking"
          clients={clients}
          users={users}
          documents={documents}
          cancelHref="/waarmerking"
        />
      </Card>
    </div>
  );
}
