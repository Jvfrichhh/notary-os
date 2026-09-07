import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { ServiceRecordForm } from "@/components/serviceRecords/ServiceRecordForm";
import { updateWaarmerking } from "@/app/(dashboard)/waarmerking/actions";

export default async function EditWaarmerkingPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.EDIT_WAARMERKING);

  const record = await prisma.waarmerking.findUnique({ where: { id: params.id }, include: { client: true } });
  if (!record) notFound();

  const [users, documents] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.document.findMany({
      where: { status: "ACTIVE" },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, fileName: true, clientId: true },
      take: 300
    })
  ]);

  const action = updateWaarmerking.bind(null, record.id);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Edit Waarmerking {record.number}</h1>
      <Card>
        <ServiceRecordForm
          action={action}
          moduleLabel="Waarmerking"
          clients={[]}
          users={users}
          documents={documents}
          lockedClient={{ id: record.client.id, fullName: record.client.fullName, clientNumber: record.client.clientNumber }}
          initial={{
            number: record.number,
            date: record.date.toISOString().slice(0, 10),
            serviceType: record.serviceType,
            status: record.status,
            picId: record.picId,
            documentId: record.documentId,
            notes: record.notes
          }}
          cancelHref={`/waarmerking/${record.id}`}
        />
      </Card>
    </div>
  );
}
