import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Archive, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatDate, formatDateTime, formatStatusLabel } from "@/lib/format";
import { archiveClient, createJobForClient, recordDataConsent, restoreClient } from "@/app/(dashboard)/clients/actions";
import { ClientNewJobForm } from "@/components/clients/ClientNewJobForm";
import { PortalAccountBanner } from "@/components/clients/PortalAccountBanner";
import { ClientPortalAccess } from "@/components/clients/ClientPortalAccess";
import { unwrapProps, type Async } from "@/lib/pageProps";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value?.trim() ? value : "-"}</p>
    </div>
  );
}

export default async function ClientDetailPage(props: Async<{ params: { id: string }; searchParams?: { portal?: string; jobFailed?: string } }>) {
  const { params, searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_CLIENTS);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_CLIENTS);
  const canDelete = await userHasPermission(user.id, PERMISSIONS.DELETE_CLIENTS);
  const canViewDocuments = await userHasPermission(user.id, PERMISSIONS.VIEW_DOCUMENTS);
  const canUploadDocuments = await userHasPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);
  const canCreateJobs = await userHasPermission(user.id, PERMISSIONS.CREATE_JOBS);
  const canBill = await userHasPermission(user.id, PERMISSIONS.EDIT_FINANCE);

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      jobs: { orderBy: { createdAt: "desc" }, take: 10, include: { pic: true } },
      documents: { orderBy: { uploadedAt: "desc" }, take: 5 },
      accounts: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!client) notFound();

  const showNewJob = canCreateJobs && client.status === "ACTIVE";
  const consentBy = client.dataConsentById
    ? (await prisma.user.findUnique({ where: { id: client.dataConsentById }, select: { name: true } }))?.name ?? null
    : null;
  const [services, staff] = showNewJob
    ? await Promise.all([
        prisma.serviceType.findMany({
          where: { isActive: true },
          orderBy: [{ category: "asc" }, { name: "asc" }],
          select: { id: true, name: true, category: true }
        }),
        prisma.user.findMany({ where: { isActive: true, role: { name: "STAFF" } }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      {searchParams?.portal && <PortalAccountBanner status={searchParams.portal} />}
      {searchParams?.jobFailed && (
        <div className="rounded-md border border-warn-border bg-warn-soft px-4 py-3 text-sm text-warn-strong">
          Klien sudah tersimpan, tetapi pekerjaannya gagal dibuat. Klik &quot;+ Pekerjaan baru&quot; untuk membuatnya lagi.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{client.clientNumber}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{client.fullName}</h1>
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
        <h2 className="mb-4 text-base font-bold text-foreground">Informasi Klien</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoRow label="Tipe" value={client.clientType} />
          <InfoRow label="NIK" value={client.nik} />
          <InfoRow label="Telepon" value={client.phone} />
          <InfoRow label="Email" value={client.email} />
          <div className="col-span-2">
            <InfoRow label="Alamat" value={client.address} />
          </div>
          <InfoRow label="Kota" value={client.city} />
          <InfoRow label="NPWP" value={client.npwp} />
          {client.companyName && <InfoRow label="Perusahaan" value={client.companyName} />}
        </div>
        {client.notes && (
          <div className="mt-4">
            <InfoRow label="Catatan" value={client.notes} />
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
          <span className={client.dataConsentAt ? "text-foreground" : "text-status-overdue"}>
            {client.dataConsentAt
              ? `Persetujuan data pribadi (UU PDP) dicatat ${formatDateTime(client.dataConsentAt)}${consentBy ? ` oleh ${consentBy}` : ""}.`
              : "Persetujuan data pribadi (UU PDP) belum dicatat."}
          </span>
          <span className="flex items-center gap-3">
            <a href={`/api/clients/${client.id}/consent-form`} className="text-xs font-medium text-primary hover:underline">
              Unduh formulir persetujuan (Word)
            </a>
            {canEdit && !client.dataConsentAt && (
              <form action={recordDataConsent.bind(null, client.id)}>
                <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                  Catat persetujuan
                </button>
              </form>
            )}
          </span>
        </div>
      </Card>

      <div className={showNewJob ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "grid grid-cols-1 gap-4"}>
        {showNewJob && (
          <Card>
            <h2 className="mb-1 text-base font-bold text-foreground">+ Pekerjaan baru</h2>
            <p className="mb-3 text-xs text-muted-foreground">Klien lama datang lagi? Buat pekerjaan baru di sini tanpa menambah data klien.</p>
            <ClientNewJobForm action={createJobForClient.bind(null, client.id)} services={services} staff={staff} withBilling={canBill} />
          </Card>
        )}

        <Card>
          <h2 className="mb-3 text-base font-bold text-foreground">Pekerjaan Terkait</h2>
          {client.jobs.length === 0 ? (
            <EmptyState title="Belum ada pekerjaan." />
          ) : (
            <div className="divide-y divide-border">
              {client.jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{j.jobNumber}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{j.description ?? "-"}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{formatStatusLabel(j.status)}</span>
                    {j.deadline && <StatusBadge tone={classifyDeadline(j.deadline, j.status)} label={`Target ${formatDate(j.deadline)}`} />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {canViewDocuments && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Dokumen Terkait</h2>
            {canUploadDocuments && (
              <Link href={`/documents/new?clientId=${client.id}`} className="text-xs font-medium text-primary hover:underline">
                + Unggah Dokumen
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

      {/* Akses Portal Klien -- dilihat siapa pun yang boleh melihat klien;
          tombol buat/reset/nonaktif hanya untuk pemilik edit_clients. */}
      <Card>
        <div className="mb-3">
          <h2 className="text-base font-bold text-foreground">Akses Portal Klien</h2>
          <p className="text-xs text-muted-foreground">
            Akun login klien di portal. Kantor membuatkan akun dan menyampaikan password sementara; klien wajib
            menggantinya saat login pertama.
          </p>
        </div>
        <ClientPortalAccess
          clientId={client.id}
          clientEmail={client.email}
          clientActive={client.status === "ACTIVE"}
          canManage={canEdit}
          accounts={client.accounts.map((a) => ({
            id: a.id,
            email: a.email,
            name: a.name,
            isActive: a.isActive,
            mustChangePassword: a.mustChangePassword,
            lastLoginAt: a.lastLoginAt ? a.lastLoginAt.toISOString() : null,
            createdAt: a.createdAt.toISOString()
          }))}
        />
      </Card>
    </div>
  );
}
