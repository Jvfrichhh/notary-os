import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { getDocumentOptionsForDeed } from "@/lib/archiveDocuments";
import { updateDerivativeDocument, archiveSalinan, restoreSalinan } from "@/app/(dashboard)/archive/actions";

export const dynamic = "force-dynamic";

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default async function SalinanDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.VIEW_MINUTA);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_MINUTA);

  const salinan = await prisma.salinan.findUnique({
    where: { id: params.id },
    include: { deed: { include: { client: true, job: true } }, document: true }
  });
  if (!salinan) notFound();

  const documents = await getDocumentOptionsForDeed(salinan.deedId);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Salinan</p>
          <h1 className="text-xl font-semibold text-foreground">Akta {salinan.deed.deedNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {salinan.deed.deedType} · {formatDate(salinan.deed.deedDate)}
          </p>
        </div>
        {salinan.recordStatus === "ARCHIVED" && (
          <span className="rounded-full bg-status-archived/10 px-2.5 py-0.5 text-xs font-medium text-status-archived">Diarsipkan</span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={`/archive/deed/${salinan.deed.id}`} className="text-primary hover:underline">
          ← Kembali ke Akta
        </Link>
        <Link href={`/clients/${salinan.deed.client.id}`} className="text-primary hover:underline">
          Lihat Client
        </Link>
        {salinan.deed.job && (
          <Link href={`/jobs/${salinan.deed.job.id}`} className="text-primary hover:underline">
            Lihat Job
          </Link>
        )}
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Dokumen</h2>
        {canEdit ? (
          <form action={updateDerivativeDocument.bind(null, "salinan", salinan.id)} className="space-y-3">
            <select name="documentId" defaultValue={salinan.documentId ?? ""} className={fieldClass}>
              <option value="">— Belum ada file terkait —</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.fileName}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Simpan
            </button>
          </form>
        ) : salinan.document ? (
          <a href={`/api/documents/${salinan.document.id}/download`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            {salinan.document.fileName}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada file.</p>
        )}
        {canEdit && salinan.document && (
          <a
            href={`/api/documents/${salinan.document.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
          >
            Buka file saat ini
          </a>
        )}
      </Card>

      {canEdit && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Arsip</h2>
          {salinan.recordStatus === "ACTIVE" ? (
            <form action={archiveSalinan.bind(null, salinan.id)}>
              <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                Arsipkan Salinan
              </button>
            </form>
          ) : (
            <form action={restoreSalinan.bind(null, salinan.id)}>
              <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                Pulihkan Salinan
              </button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
