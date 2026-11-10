import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { MinutaForm } from "@/components/archive/MinutaForm";
import { createMinuta } from "@/app/(dashboard)/archive/actions";
import { getDocumentOptionsForDeed } from "@/lib/archiveDocuments";
import { unwrapProps, type Async } from "@/lib/pageProps";
import { getT } from "@/lib/i18n/server";

export default async function NewMinutaPage(props: Async<{ searchParams: { deedId?: string } }>) {
  const { tp } = await getT();
  const { searchParams } = await unwrapProps(props);
  await requirePermission(PERMISSIONS.EDIT_MINUTA);

  const deedId = searchParams.deedId;
  if (!deedId) notFound();

  const deed = await prisma.deed.findUnique({ where: { id: deedId } });
  if (!deed) notFound();

  const documents = await getDocumentOptionsForDeed(deedId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{tp("Minuta Baru")}</h1>
        <p className="text-sm text-muted-foreground">{tp("Akta")} {deed.deedNumber}</p>
      </div>

      <Card>
        <MinutaForm
          action={createMinuta}
          deeds={[]}
          documents={documents}
          lockedDeed={{ id: deed.id, label: `${deed.deedNumber} — ${deed.deedType}` }}
          cancelHref={`/archive/deed/${deed.id}`}
        />
      </Card>
    </div>
  );
}
