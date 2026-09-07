import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { WasiatForm } from "@/components/wasiat/WasiatForm";
import { updateWasiat } from "@/app/(dashboard)/wasiat/actions";

export default async function EditWasiatPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.EDIT_WASIAT);

  const record = await prisma.wasiat.findUnique({ where: { id: params.id }, include: { client: true } });
  if (!record) notFound();

  const documents = await prisma.document.findMany({
    where: { status: "ACTIVE" },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, fileName: true, clientId: true },
    take: 300
  });

  const action = updateWasiat.bind(null, record.id);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Edit Wasiat</h1>
      <Card>
        <WasiatForm
          action={action}
          clients={[]}
          jobs={[]}
          documents={documents}
          lockedClient={{ id: record.client.id, fullName: record.client.fullName, clientNumber: record.client.clientNumber }}
          initial={{
            deedNumber: record.deedNumber,
            date: record.date ? record.date.toISOString().slice(0, 10) : "",
            wasiatType: record.wasiatType,
            repertoriumId: record.repertoriumId,
            status: record.status,
            evidenceDocumentId: record.evidenceDocumentId,
            notes: record.notes
          }}
          cancelHref={`/wasiat/${record.id}`}
        />
      </Card>
    </div>
  );
}
