import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatDate, formatStatusLabel } from "@/lib/format";
import { archiveWaarmerking, restoreWaarmerking } from "@/app/(dashboard)/waarmerking/actions";

export const dynamic = "force-dynamic";

export default async function WaarmerkingDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.VIEW_WAARMERKING);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_WAARMERKING);

  const record = await prisma.waarmerking.findUnique({
    where: { id: params.id },
    include: { client: true, pic: true, document: true }
  });
  if (!record) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Waarmerking</p>
          <h1 className="text-xl font-semibold text-foreground">{record.number}</h1>
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
            <dt className="text-xs text-muted-foreground">Jenis Layanan</dt>
            <dd className="text-foreground">{record.serviceType ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">PIC</dt>
            <dd className="text-foreground">{record.pic?.name ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dokumen Terkait</dt>
            <dd>
              {record.document ? (
                <a href={`/api/documents/${record.document.id}/download`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {record.document.fileName}
                </a>
              ) : (
                <span className="text-muted-foreground">Belum ada file</span>
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
          <Link href={`/waarmerking/${record.id}/edit`} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Edit
          </Link>
          {record.recordStatus === "ACTIVE" ? (
            <form action={archiveWaarmerking.bind(null, record.id)}>
              <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-status-overdue hover:bg-status-overdue/10">
                Arsipkan
              </button>
            </form>
          ) : (
            <form action={restoreWaarmerking.bind(null, record.id)}>
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
