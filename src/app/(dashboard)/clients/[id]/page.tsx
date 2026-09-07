import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Archive, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatDate, formatStatusLabel } from "@/lib/format";
import { archiveClient, restoreClient } from "@/app/(dashboard)/clients/actions";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value?.trim() ? value : "-"}</p>
    </div>
  );
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.VIEW_CLIENTS);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_CLIENTS);
  const canDelete = await userHasPermission(user.id, PERMISSIONS.DELETE_CLIENTS);
  const canViewDocuments = await userHasPermission(user.id, PERMISSIONS.VIEW_DOCUMENTS);
  const canUploadDocuments = await userHasPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      visits: { orderBy: { visitDate: "desc" }, take: 5 },
      jobs: { orderBy: { createdAt: "desc" }, take: 5, include: { pic: true } },
      documents: { orderBy: { uploadedAt: "desc" }, take: 5 }
    }
  });

  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{client.clientNumber}</p>
          <h1 className="text-xl font-semibold text-foreground">{client.fullName}</h1>
          {client.status === "ARCHIVED" && (
            <span className="mt-1 inline-block rounded-full bg-status-archived/10 px-2.5 py-0.5 text-xs font-medium text-status-archived">
              Diarsipkan
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && client.status === "ACTIVE" && (
            <Link
              href={`/clients/${client.id}/edit`}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          )}
          {canDelete && client.status === "ACTIVE" && (
            <form action={archiveClient.bind(null, client.id)}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-status-overdue hover:bg-status-overdue/10"
              >
                <Archive className="h-4 w-4" />
                Arsipkan
              </button>
            </form>
          )}
          {canEdit && client.status === "ARCHIVED" && (
            <form action={restoreClient.bind(null, client.id)}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <RotateCcw className="h-4 w-4" />
                Aktifkan Kembali
              </button>
            </form>
          )}
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Informasi Client</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoRow label="Tipe" value={client.clientType} />
          <InfoRow label="NIK" value={client.nik} />
          <InfoRow label="Telepon" value={client.phone} />
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Kota" value={client.city} />
          <InfoRow label="Perusahaan" value={client.companyName} />
          <InfoRow label="NPWP" value={client.npwp} />
        </div>
        {client.address && (
          <div className="mt-4">
            <InfoRow label="Alamat" value={client.address} />
          </div>
        )}
        {client.notes && (
          <div className="mt-4">
            <InfoRow label="Catatan" value={client.notes} />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Kunjungan Terakhir</h2>
          {client.visits.length === 0 ? (
            <EmptyState title="Belum ada kunjungan." />
          ) : (
            <div className="divide-y divide-border">
              {client.visits.map((v) => (
                <Link key={v.id} href={`/visits/${v.id}`} className="block py-2.5 text-sm hover:bg-muted/50">
                  <p className="font-medium text-foreground">{v.purpose ?? "Kunjungan"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.visitDate).toLocaleDateString("id-ID")} · {v.serviceCategory ?? "-"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Job Terkait</h2>
          {client.jobs.length === 0 ? (
            <EmptyState title="Belum ada job." />
          ) : (
            <div className="divide-y divide-border">
              {client.jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between py-2.5 text-sm hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">{j.jobNumber}</p>
                    <p className="text-xs text-muted-foreground">{j.description ?? "-"}</p>
                  </div>
                  <StatusBadge tone={classifyDeadline(j.deadline, j.status)} label={formatStatusLabel(j.status)} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {canViewDocuments && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Dokumen Terkait</h2>
            {canUploadDocuments && (
              <Link href={`/documents/new?clientId=${client.id}`} className="text-xs font-medium text-primary hover:underline">
                + Upload Dokumen
              </Link>
            )}
          </div>
          {client.documents.length === 0 ? (
            <EmptyState title="Belum ada dokumen." />
          ) : (
            <div className="divide-y divide-border">
              {client.documents.map((doc) => (
                <Link key={doc.id} href={`/documents/${doc.id}`} className="flex items-center justify-between py-2.5 text-sm hover:bg-muted/50">
                  <span className="font-medium text-foreground">{doc.fileName}</span>
                  <span className="text-xs text-muted-foreground">{formatStatusLabel(doc.category)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
