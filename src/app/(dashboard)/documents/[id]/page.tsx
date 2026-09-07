import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, RotateCcw, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatDateTime, formatFileSize, formatStatusLabel } from "@/lib/format";
import { archiveDocument, restoreDocument, uploadNewVersion } from "@/app/(dashboard)/documents/actions";
import { ACCEPT_ATTRIBUTE } from "@/lib/uploadValidation";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value?.trim() ? value : "-"}</p>
    </div>
  );
}

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.VIEW_DOCUMENTS);
  const canUpload = await userHasPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);
  const canDelete = await userHasPermission(user.id, PERMISSIONS.DELETE_DOCUMENTS);

  const document = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      job: true,
      uploader: true,
      versions: { orderBy: { versionNumber: "desc" } }
    }
  });

  if (!document) notFound();

  // Dokumen lama (seed) mungkin belum punya baris versi -- tampilkan
  // Document itu sendiri sebagai v1 kalau begitu.
  const versions =
    document.versions.length > 0
      ? document.versions
      : [
          {
            id: "implicit-v1",
            versionNumber: 1,
            isCurrent: true,
            storageKey: document.storageKey,
            fileName: document.fileName,
            fileType: document.fileType,
            fileSize: document.fileSize,
            uploadedAt: document.uploadedAt,
            uploadedBy: document.uploadedBy,
            notes: null as string | null
          }
        ];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{formatStatusLabel(document.category)}</p>
          <h1 className="break-all text-xl font-semibold text-foreground">{document.fileName}</h1>
          {document.status === "ARCHIVED" && (
            <span className="mt-1 inline-block rounded-full bg-status-archived/10 px-2.5 py-0.5 text-xs font-medium text-status-archived">
              Diarsipkan
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`/api/documents/${document.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Buka / Unduh
          </a>
          {canDelete && document.status === "ACTIVE" && (
            <form action={archiveDocument.bind(null, document.id)}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-status-overdue hover:bg-status-overdue/10"
              >
                <Archive className="h-4 w-4" />
                Arsipkan
              </button>
            </form>
          )}
          {canDelete && document.status === "ARCHIVED" && (
            <form action={restoreDocument.bind(null, document.id)}>
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
        <h2 className="mb-4 text-sm font-semibold text-foreground">Metadata</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoRow label="Tipe File" value={document.fileType} />
          <InfoRow label="Ukuran" value={formatFileSize(document.fileSize)} />
          <InfoRow label="Diunggah Oleh" value={document.uploader?.name} />
          <InfoRow label="Tanggal Unggah" value={formatDateTime(document.uploadedAt)} />
          <div>
            <p className="text-xs text-muted-foreground">Client</p>
            {document.client ? (
              <Link href={`/clients/${document.client.id}`} className="text-sm text-primary hover:underline">
                {document.client.fullName}
              </Link>
            ) : (
              <p className="text-sm text-foreground">-</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Job</p>
            {document.job ? (
              <Link href={`/jobs/${document.job.id}`} className="text-sm text-primary hover:underline">
                {document.job.jobNumber}
              </Link>
            ) : (
              <p className="text-sm text-foreground">-</p>
            )}
          </div>
        </div>
        {document.description && (
          <div className="mt-4">
            <InfoRow label="Deskripsi" value={document.description} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Riwayat Versi</h2>
        <div className="divide-y divide-border">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  v{v.versionNumber}
                  {v.isCurrent && (
                    <span className="ml-2 rounded-full bg-status-on-track/10 px-2 py-0.5 text-[10px] font-medium text-status-on-track">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(v.uploadedAt)} · {formatFileSize(v.fileSize ?? document.fileSize)}
                  {v.notes ? ` · ${v.notes}` : ""}
                </p>
              </div>
              <a
                href={`/api/documents/${document.id}/download?version=${v.versionNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline"
              >
                Buka
              </a>
            </div>
          ))}
        </div>

        {canUpload && document.status === "ACTIVE" && (
          <form
            action={uploadNewVersion.bind(null, document.id)}
            encType="multipart/form-data"
            className="mt-4 space-y-2 border-t border-border pt-4"
          >
            <p className="text-sm font-medium text-foreground">Upload Versi Baru</p>
            <input
              type="file"
              name="file"
              required
              accept={ACCEPT_ATTRIBUTE}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="text"
              name="notes"
              placeholder="Catatan versi (opsional)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
              Upload sebagai Versi Baru
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
