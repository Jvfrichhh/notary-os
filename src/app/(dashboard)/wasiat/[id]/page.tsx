import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatDate, formatStatusLabel } from "@/lib/format";
import { archiveWasiat, restoreWasiat } from "@/app/(dashboard)/wasiat/actions";

export const dynamic = "force-dynamic";

export default async function WasiatDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.VIEW_WASIAT);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_WASIAT);

  const record = await prisma.wasiat.findUnique({
    where: { id: params.id },
    include: { client: true, job: true, evidenceDocument: true }
  });
  if (!record) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-md border border-status-due-soon/30 bg-status-due-soon/10 px-3 py-2 text-xs text-foreground">
        Pencatatan internal kantor saja — bukan pengganti sistem AHU maupun kewajiban pelaporan resmi wasiat.
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Wasiat</p>
          <h1 className="text-xl font-semibold text-foreground">{record.deedNumber ?? "Belum ada nomor akta"}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(record.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">{formatStatusLabel(record.status)}</span>
          {record.recordStatus === "ARCHIVED" && (
            <span className="rounded-full bg-status-archived/10 px-2.5 py-0.5 text-xs font-medium text-status-archived">Diarsipkan</span>
          )}
        </div>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Client</dt>
            <dd>
              <Link href={`/clients/${record.client.id}`} className="text-primary hover:underline">
                {record.client.fullName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Job Terkait</dt>
            <dd>
              {record.job ? (
                <Link href={`/jobs/${record.job.id}`} className="text-primary hover:underline">
                  {record.job.jobNumber}
                </Link>
              ) : (
                <span className="text-foreground">-</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Jenis Wasiat</dt>
            <dd className="text-foreground">{record.wasiatType ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Referensi Repertorium</dt>
            <dd className="text-foreground">{record.repertoriumId ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dokumen Bukti</dt>
            <dd>
              {record.evidenceDocument ? (
                <a
                  href={`/api/documents/${record.evidenceDocument.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {record.evidenceDocument.fileName}
                </a>
              ) : (
                <span className="text-muted-foreground">Belum ada</span>
              )}
            </dd>
          </div>
        </dl>
        {record.notes && (
          <div className="mt-4">
            <dt className="text-xs text-muted-foreground">Catatan</dt>
            <dd className="text-sm text-foreground">{record.notes}</dd>
          </div>
        )}
      </Card>

      {canEdit && (
        <div className="flex items-center gap-2">
          <Link href={`/wasiat/${record.id}/edit`} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Edit
          </Link>
          {record.recordStatus === "ACTIVE" ? (
            <form action={archiveWasiat.bind(null, record.id)}>
              <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-status-overdue hover:bg-status-overdue/10">
                Arsipkan
              </button>
            </form>
          ) : (
            <form action={restoreWasiat.bind(null, record.id)}>
              <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                Pulihkan
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
