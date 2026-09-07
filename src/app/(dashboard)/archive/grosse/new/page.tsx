import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { DerivativeForm } from "@/components/archive/DerivativeForm";
import { createGrosse } from "@/app/(dashboard)/archive/actions";
import { getDocumentOptionsForDeed } from "@/lib/archiveDocuments";

export default async function NewGrossePage({ searchParams }: { searchParams: { deedId?: string } }) {
  await requirePermission(PERMISSIONS.EDIT_MINUTA);

  const deedId = searchParams.deedId;
  if (!deedId) notFound();

  const deed = await prisma.deed.findUnique({ where: { id: deedId } });
  if (!deed) notFound();

  const documents = await getDocumentOptionsForDeed(deedId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Grosse Baru</h1>
        <p className="text-sm text-muted-foreground">Akta {deed.deedNumber}</p>
      </div>
      <Card>
        <DerivativeForm
          action={createGrosse}
          label="Grosse"
          deeds={[]}
          documents={documents}
          lockedDeed={{ id: deed.id, label: `${deed.deedNumber} — ${deed.deedType}` }}
          cancelHref={`/archive/deed/${deed.id}`}
        />
      </Card>
    </div>
  );
}
