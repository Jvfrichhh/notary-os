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
import { archiveClient, createJobForClient, recordDataConsent, recordPpatkReport, restoreClient } from "@/app/(dashboard)/clients/actions";
import { ClientNewJobForm } from "@/components/clients/ClientNewJobForm";
import { PortalAccountBanner } from "@/components/clients/PortalAccountBanner";
import { ClientPortalAccess } from "@/components/clients/ClientPortalAccess";
import { unwrapProps, type Async } from "@/lib/pageProps";
import { getT } from "@/lib/i18n/server";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words text-sm text-foreground">{value?.trim() ? value : "-"}</p>
    </div>
  );
}

export default async function ClientDetailPage(props: Async<{ params: { id: string }; searchParams?: { portal?: string; jobFailed?: string; ppatk?: string } }>) {
  const { tp } = await getT();
  const { params, searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_CLIENTS);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_CLIENTS);
  const canDelete = await userHasPermission(user.id, PERMISSIONS.DELETE_CLIENTS);
  const canViewDocuments = await userHasPermission(user.id, PERMISSIONS.VIEW_DOCUMENTS);
  const canUploadDocuments = await userHasPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);
  const canCreateJobs = await userHasPermission(user.id, PERMISSIONS.CREATE_JOBS);
  const canBill = await userHasPermission(user.id, PERMISSIONS.EDIT_FINANCE);
  // Catatan pelaporan PPATK bersifat rahasia: hanya pemegang izin log audit (Notaris/Admin).
  const canSeePpatk = await userHasPermission(user.id, PERMISSIONS.VIEW_AUDIT_LOG);
  const ppatkReports = canSeePpatk ? await prisma.ppatkReport.findMany({ where: { clientId: params.id }, orderBy: { reportedAt: "desc" } }) : [];
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

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
          {tp("Klien sudah tersimpan, tetapi pekerjaannya gagal dibuat. Klik \"+ Pekerjaan baru\" untuk membuatnya lagi.")}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{client.clientNumber}</p>
          <h1 className="break-words text-2xl font-extrabold tracking-tight text-foreground">{client.fullName}</h1>
          {client.status === "ARCHIVED" && (
            <span className="mt-1 inline-block rounded-full bg-status-archived/10 px-2.5 py-0.5 text-xs font-medium text-status-archived">
              {tp("Diarsipkan")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && client.status === "ACTIVE" && (
            <Link
              href={`/clients/${client.id}/edit`}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
              {tp("Edit")}
            </Link>
          )}
          {canDelete && client.status === "ACTIVE" && (
            <form action={archiveClient.bind(null, client.id)}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-status-overdue hover:bg-status-overdue/10"
              >
                <Archive className="h-4 w-4" />
                {tp("Arsipkan")}
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
                {tp("Aktifkan Kembali")}
              </button>
            </form>
          )}
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-base font-bold text-foreground">{tp("Informasi Klien")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoRow label={tp("Tipe")} value={client.clientType} />
          <InfoRow label={tp("NIK")} value={client.nik} />
          <InfoRow label={tp("Telepon")} value={client.phone} />
          <InfoRow label={tp("Email")} value={client.email} />
          <div className="col-span-2">
            <InfoRow label={tp("Alamat")} value={client.address} />
          </div>
          <InfoRow label={tp("Kota")} value={client.city} />
          <InfoRow label={tp("NPWP")} value={client.npwp} />
          <InfoRow label={tp("Pekerjaan")} value={client.occupation} />
          <InfoRow label={tp("Status Perkawinan")} value={client.maritalStatus} />
          {client.companyName && <InfoRow label={tp("Perusahaan")} value={client.companyName} />}
          {client.representative && (
            <div className="col-span-2">
              <InfoRow label={tp("Wakil Badan Usaha")} value={client.representative} />
            </div>
          )}
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">{tp("Pengenalan Pengguna Jasa (PMPJ)")}</h3>
            {client.riskLevel ? (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  client.riskLevel === "TINGGI"
                    ? "bg-status-overdue/10 text-status-overdue"
                    : client.riskLevel === "SEDANG"
                      ? "bg-status-due-soon/10 text-status-due-soon"
                      : "bg-status-on-track/10 text-status-on-track"
                }`}
              >
                {tp("Risiko")} {client.riskLevel.toLowerCase()}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{tp("Belum dinilai")}</span>
            )}
            {client.isPep && <span className="rounded-full bg-status-overdue/10 px-2.5 py-0.5 text-xs font-medium text-status-overdue">{tp("PEP")}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <InfoRow label={tp("Sumber Dana")} value={client.sourceOfFunds} />
            <InfoRow label={tp("Tujuan Transaksi")} value={client.transactionPurpose} />
            <div className="col-span-2">
              <InfoRow label={tp("Pemilik Manfaat")} value={client.beneficialOwner} />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {client.pmpjUpdatedAt ? tp("PMPJ terakhir diperbarui {0}.", [formatDateTime(client.pmpjUpdatedAt)]) : tp("PMPJ belum diisi. Lengkapi lewat tombol Edit bila transaksinya wajib PMPJ.")}{" "}
            <a href={`/api/clients/${client.id}/pmpj-form`} className="font-medium text-primary hover:underline">
              {tp("Unduh formulir PMPJ (Word)")}
            </a>
          </p>
          {canSeePpatk && (
            <div id="ppatk" className="mt-3 scroll-mt-24 rounded-md border border-border p-3">
              <h3 className="text-sm font-bold text-foreground">{tp("Pelaporan PPATK (")}{ppatkReports.length})</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {tp("Laporan transaksi keuangan mencurigakan dikirim lewat aplikasi goAML PPATK; di sini hanya dicatat bahwa sudah dilaporkan. Bagian ini hanya terlihat oleh Notaris/Admin dan tidak boleh diberitahukan kepada klien.")}
              </p>
              {searchParams?.ppatk === "ok" && <p className="mt-1 text-xs text-status-on-track">{tp("Pelaporan dicatat.")}</p>}
              {searchParams?.ppatk === "invalid" && (
                <p role="alert" className="mt-1 text-xs text-status-overdue">
                  {tp("Isi tanggal lapor dan keterangan (minimal 5 huruf).")}
                </p>
              )}
              {ppatkReports.length > 0 && (
                <ul className="mt-2 divide-y divide-border text-sm">
                  {ppatkReports.map((r) => (
                    <li key={r.id} className="py-2">
                      <p className="font-medium text-foreground">
                        {r.kind === "LTKM" ? tp("LTKM") : tp("Laporan lain")} · {formatDate(r.reportedAt)}
                        {r.reference ? tp(" · ref. {0}", [r.reference]) : ""}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{r.notes}</p>
                    </li>
                  ))}
                </ul>
              )}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-medium text-foreground">{tp("Catat pelaporan")}</summary>
                <form action={recordPpatkReport.bind(null, client.id)} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label>
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Jenis")}</span>
                    <select name="kind" defaultValue="LTKM" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground">
                      <option value="LTKM">{tp("LTKM (transaksi mencurigakan)")}</option>
                      <option value="LAINNYA">{tp("Laporan lain")}</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Tanggal lapor")}</span>
                    <input type="date" name="reportedAt" required defaultValue={hariIni} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Nomor referensi goAML")}</span>
                    <input name="reference" maxLength={120} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
                  </label>
                  <label className="sm:col-span-3">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Keterangan (transaksi & alasan)")}</span>
                    <textarea name="notes" required minLength={5} maxLength={1000} rows={2} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
                  </label>
                  <div className="sm:col-span-3">
                    <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
                      {tp("Simpan catatan")}
                    </button>
                  </div>
                </form>
              </details>
            </div>
          )}
        </div>
        {client.notes && (
          <div className="mt-4">
            <InfoRow label={tp("Catatan")} value={client.notes} />
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
          <span className={client.dataConsentAt ? "text-foreground" : "text-status-overdue"}>
            {client.dataConsentAt
              ? tp("Persetujuan data pribadi (UU PDP) dicatat {0}{1}.", [formatDateTime(client.dataConsentAt), consentBy ? ` oleh ${consentBy}` : ""])
              : tp("Persetujuan data pribadi (UU PDP) belum dicatat.")}
          </span>
          <span className="flex flex-wrap items-center gap-3">
            <a href={`/api/clients/${client.id}/consent-form`} className="text-xs font-medium text-primary hover:underline">
              {tp("Unduh formulir persetujuan (Word)")}
            </a>
            {canEdit && !client.dataConsentAt && (
              <form action={recordDataConsent.bind(null, client.id)}>
                <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                  {tp("Catat persetujuan")}
                </button>
              </form>
            )}
          </span>
        </div>
      </Card>

      <div className={showNewJob ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "grid grid-cols-1 gap-4"}>
        {showNewJob && (
          <Card>
            <h2 className="mb-1 text-base font-bold text-foreground">{tp("+ Pekerjaan baru")}</h2>
            <p className="mb-3 text-xs text-muted-foreground">{tp("Klien lama datang lagi? Buat pekerjaan baru di sini tanpa menambah data klien.")}</p>
            <ClientNewJobForm action={createJobForClient.bind(null, client.id)} services={services} staff={staff} withBilling={canBill} />
          </Card>
        )}

        <Card>
          <h2 className="mb-3 text-base font-bold text-foreground">{tp("Pekerjaan Terkait")}</h2>
          {client.jobs.length === 0 ? (
            <EmptyState title={tp("Belum ada pekerjaan.")} />
          ) : (
            <div className="divide-y divide-border">
              {client.jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{j.jobNumber}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{j.description ?? "-"}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{tp(formatStatusLabel(j.status))}</span>
                    {j.deadline && <StatusBadge tone={classifyDeadline(j.deadline, j.status)} label={tp("Target {0}", [formatDate(j.deadline)])} />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {canViewDocuments && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-foreground">{tp("Dokumen Terkait")}</h2>
            {canUploadDocuments && (
              <Link href={`/documents/new?clientId=${client.id}`} className="text-xs font-medium text-primary hover:underline">
                {tp("+ Unggah Dokumen")}
              </Link>
            )}
          </div>
          {client.documents.length === 0 ? (
            <EmptyState title={tp("Belum ada dokumen.")} />
          ) : (
            <div className="divide-y divide-border">
              {client.documents.map((doc) => (
                <Link key={doc.id} href={`/documents/${doc.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50">
                  <span className="min-w-0 break-all font-medium text-foreground">{doc.fileName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{tp(formatStatusLabel(doc.category))}</span>
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
          <h2 className="text-base font-bold text-foreground">{tp("Akses Portal Klien")}</h2>
          <p className="text-xs text-muted-foreground">
            {tp("Akun login klien di portal. Kantor membuatkan akun dan menyampaikan password sementara; klien wajib menggantinya saat login pertama.")}
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
