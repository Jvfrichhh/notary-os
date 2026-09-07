import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatDate, formatStatusLabel } from "@/lib/format";
import { getDocumentOptionsForDeed } from "@/lib/archiveDocuments";
import { updateDerivativeDocument, updateDerivativeStatus, archiveGrosse, restoreGrosse } from "@/app/(dashboard)/archive/actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["DRAFT", "PROCESS", "DONE"] as const;
const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default async function GrosseDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.VIEW_MINUTA);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_MINUTA);

  const record = await prisma.grosse.findUnique({
    where: { id: params.id },
    include: { deed: { include: { client: true, job: true } }, document: true }
  });
  if (!record) notFound();

  const documents = await getDocumentOptionsForDeed(record.deedId);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Grosse</p>
          <h1 className="text-xl font-semibold text-foreground">Akta {record.deed.deedNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {record.deed.deedType} · {formatDate(record.deed.deedDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">{formatStatusLabel(record.status)}</span>
          {record.recordStatus === "ARCHIVED" && (
            <span className="rounded-full bg-status-archived/10 px-2.5 py-0.5 text-xs font-medium text-status-archived">Diarsipkan</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={`/archive/deed/${record.deed.id}`} className="text-primary hover:underline">
          ← Kembali ke Akta
        </Link>
        <Link href={`/clients/${record.deed.client.id}`} className="text-primary hover:underline">
          Lihat Client
        </Link>
        {record.deed.job && (
          <Link href={`/jobs/${record.deed.job.id}`} className="text-primary hover:underline">
            Lihat Job
          </Link>
        )}
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Dokumen</h2>
        {canEdit ? (
          <form action={updateDerivativeDocument.bind(null, "grosse", record.id)} className="space-y-3">
            <select name="documentId" defaultValue={record.documentId ?? ""} className={fieldClass}>
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
        ) : record.document ? (
          <a href={`/api/documents/${record.document.id}/download`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            {record.document.fileName}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada file.</p>
        )}
        {canEdit && record.document && (
          <a
            href={`/api/documents/${record.document.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
          >
            Buka file saat ini
          </a>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {canEdit && (
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Status</h2>
            <form action={updateDerivativeStatus.bind(null, "grosse", record.id)} className="space-y-2">
              <select name="status" defaultValue={record.status} className={fieldClass}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {formatStatusLabel(s)}
                  </option>
                ))}
              </select>
              <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Update Status
              </button>
            </form>
          </Card>
        )}

        {canEdit && (
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Arsip</h2>
            {record.recordStatus === "ACTIVE" ? (
              <form action={archiveGrosse.bind(null, record.id)}>
                <button type="submit" className="w-full rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-muted">
                  Arsipkan Grosse
                </button>
              </form>
            ) : (
              <form action={restoreGrosse.bind(null, record.id)}>
                <button type="submit" className="w-full rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-muted">
                  Pulihkan Grosse
                </button>
              </form>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
