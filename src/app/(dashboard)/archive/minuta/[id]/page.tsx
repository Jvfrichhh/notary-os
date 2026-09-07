import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { getDocumentOptionsForDeed } from "@/lib/archiveDocuments";
import { updateMinuta, archiveMinuta, restoreMinuta } from "@/app/(dashboard)/archive/actions";
export const dynamic = "force-dynamic";

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default async function MinutaDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.VIEW_MINUTA);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_MINUTA);

  const minuta = await prisma.minuta.findUnique({
    where: { id: params.id },
    include: { deed: { include: { client: true, job: true } }, document: true, repertorium: true }
  });

  if (!minuta) notFound();

  const [documents, repertoriumOptions] = await Promise.all([
    getDocumentOptionsForDeed(minuta.deedId),
    prisma.repertorium.findMany({
      where: { deedId: minuta.deedId, recordStatus: "ACTIVE" },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Minuta</p>
          <h1 className="text-xl font-semibold text-foreground">Akta {minuta.deed.deedNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {minuta.deed.deedType} · {formatDate(minuta.deed.deedDate)}
          </p>
        </div>
        {minuta.recordStatus === "ARCHIVED" && (
          <span className="rounded-full bg-status-archived/10 px-2.5 py-0.5 text-xs font-medium text-status-archived">
            Diarsipkan
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={`/archive/deed/${minuta.deed.id}`} className="text-primary hover:underline">
          ← Kembali ke Akta
        </Link>
        <Link href={`/clients/${minuta.deed.client.id}`} className="text-primary hover:underline">
          Lihat Client
        </Link>
        {minuta.deed.job && (
          <Link href={`/jobs/${minuta.deed.job.id}`} className="text-primary hover:underline">
            Lihat Job
          </Link>
        )}
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Metadata</h2>
        {canEdit ? (
          <form action={updateMinuta.bind(null, minuta.id)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Dokumen (Document Vault)</label>
              <select name="documentId" defaultValue={minuta.documentId ?? ""} className={fieldClass}>
                <option value="">— Belum ada file terkait —</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.fileName}
                  </option>
                ))}
              </select>
              {minuta.document && (
                <a
                  href={`/api/documents/${minuta.document.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                >
                  Buka file saat ini
                </a>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Repertorium</label>
              <select name="repertoriumId" defaultValue={minuta.repertoriumId ?? ""} className={fieldClass}>
                <option value="">— Belum ditautkan —</option>
                {repertoriumOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.year}/{String(r.sequenceNumber).padStart(4, "0")} — {r.appearerName}
                  </option>
                ))}
              </select>
              {repertoriumOptions.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Belum ada Repertorium untuk akta ini.{" "}
                  <Link href={`/notary-record/new?deedId=${minuta.deed.id}`} className="text-primary hover:underline">
                    Catat sekarang
                  </Link>
                  .
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Catatan</label>
              <textarea name="notes" rows={3} defaultValue={minuta.notes ?? ""} className={fieldClass} />
            </div>
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Simpan Perubahan
            </button>
          </form>
        ) : (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">File</dt>
              <dd>
                {minuta.document ? (
                  <a href={`/api/documents/${minuta.document.id}/download`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {minuta.document.fileName}
                  </a>
                ) : (
                  "Belum ada file"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Repertorium</dt>
              <dd className="text-foreground">
                {minuta.repertorium ? (
                  <Link href={`/notary-record/${minuta.repertorium.id}`} className="text-primary hover:underline">
                    {minuta.repertorium.year}/{String(minuta.repertorium.sequenceNumber).padStart(4, "0")}
                  </Link>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Catatan</dt>
              <dd className="text-foreground">{minuta.notes ?? "-"}</dd>
            </div>
          </dl>
        )}
      </Card>

      {canEdit && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Arsip</h2>
          {minuta.recordStatus === "ACTIVE" ? (
            <form action={archiveMinuta.bind(null, minuta.id)}>
              <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                Arsipkan Minuta
              </button>
            </form>
          ) : (
            <form action={restoreMinuta.bind(null, minuta.id)}>
              <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                Pulihkan Minuta
              </button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
