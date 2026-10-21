import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatCurrency, formatDate, formatDateJakarta, formatStatusLabel, toDateInput } from "@/lib/format";
import { getValidNextStatuses } from "@/lib/jobStatus";
import {
  addJobTask,
  approveJobReview,
  changeJobStatusForm,
  requestJobRevision,
  submitJobForReview,
  updateJobDetails,
  reviewChecklistDocument,
  toggleChecklistItem,
  toggleTaskStatus
} from "@/app/(dashboard)/jobs/actions";
import { ClientUploadReview } from "@/components/jobs/ClientUploadReview";
import { DocumentAiPanel } from "@/components/documents/DocumentAiPanel";
import { toAnalysisView } from "@/lib/ai/analysisView";
import { latestAnalysisFor } from "@/lib/ai/documentAnalysis";
import { isAiEnabled } from "@/lib/ai/client";
import { deedTemplateOptions } from "@/lib/deeds/registry";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import { createDeedDraft } from "@/app/(dashboard)/jobs/[id]/deeds/actions";
import { formatDateTime as fmtDeedTime } from "@/lib/format";
import { PortalAccountBanner } from "@/components/clients/PortalAccountBanner";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { created?: string; ok?: string; err?: string; portal?: string };
}) {
  const user = await requirePermission(PERMISSIONS.VIEW_JOBS);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_JOBS);
  const canViewFinance = await userHasPermission(user.id, PERMISSIONS.VIEW_FINANCE);
  const canViewDocuments = await userHasPermission(user.id, PERMISSIONS.VIEW_DOCUMENTS);
  const canUploadDocuments = await userHasPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);
  const canViewArchive = await userHasPermission(user.id, PERMISSIONS.VIEW_MINUTA);
  const canEditArchive = await userHasPermission(user.id, PERMISSIONS.EDIT_MINUTA);
  const canEditClients = await userHasPermission(user.id, PERMISSIONS.EDIT_CLIENTS);
  const canEditFinance = await userHasPermission(user.id, PERMISSIONS.EDIT_FINANCE);
  // "Notaris" = pemberi perintah kerja (create_jobs): ubah job, setujui, selesaikan, batalkan.
  const isNotary = await userHasPermission(user.id, PERMISSIONS.CREATE_JOBS);
  const aiEnabled = isAiEnabled();

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      serviceType: true,
      pic: true,
      notary: true,
      tasks: { orderBy: { createdAt: "asc" } },
      deedDrafts: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, templateKey: true, title: true, updatedAt: true, deed: { select: { deedNumber: true } } }
      },
      checklists: {
        include: {
          items: {
            include: { attachedDocument: { select: { id: true, fileName: true, uploadedAt: true, uploadedByClientAccountId: true } } }
          }
        }
      },
      payments: true,
      documents: true,
      deeds: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!job) notFound();

  // Membuka halaman job = notifikasi Anda tentang job ini dianggap sudah dibaca.
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false, relatedEntityType: "Job", relatedEntityId: job.id },
    data: { isRead: true }
  });

  const NOTARY_ONLY = ["READY_FOR_SIGNING", "COMPLETED", "CANCELLED"];
  // Pengajuan/persetujuan/revisi punya tombol sendiri; dropdown hanya untuk status lain.
  // Staf tidak bisa menarik pekerjaan yang sedang diperiksa / sudah disetujui Notaris.
  const lockedForStaff = !isNotary && (job.status === "REVIEW" || job.status === "READY_FOR_SIGNING");
  const nextStatuses = lockedForStaff
    ? []
    : getValidNextStatuses(job.status).filter(
        (s) =>
          s !== "REVIEW" &&
          s !== "READY_FOR_SIGNING" &&
          (isNotary || !NOTARY_ONLY.includes(s)) &&
          !((job.status === "REVIEW" || job.status === "READY_FOR_SIGNING") && s === "IN_PROGRESS")
      );
  const isFinal = job.status === "COMPLETED" || job.status === "CANCELLED";
  const staffOptions = isNotary && !isFinal
    ? await prisma.user.findMany({
        where: { isActive: true, role: { name: "STAFF" } },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      })
    : [];
  const dateInput = toDateInput;
  const openDrafts = job.deedDrafts.filter((d) => !d.deed).length;

  // Riwayat pekerjaan dari audit log (status, draft akta, pengesahan).
  const timeline = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Job", entityId: job.id },
        { entityType: "DeedDraft", entityId: { in: job.deedDrafts.map((d) => d.id) } },
        { entityType: "Deed", entityId: { in: job.deeds.map((d) => d.id) } }
      ]
    },
    orderBy: { timestamp: "desc" },
    take: 30,
    select: { id: true, action: true, timestamp: true, newValue: true, user: { select: { name: true } } }
  });

  // Unggahan klien yang bisa dianalisis AI: analisis terbaru per dokumen.
  const clientUploadIds = job.checklists
    .flatMap((c) => c.items)
    .filter((i) => i.attachedDocument?.uploadedByClientAccountId)
    .map((i) => i.attachedDocument!.id);
  const aiAnalyses = aiEnabled && canViewDocuments ? await latestAnalysisFor(clientUploadIds) : new Map();
  const totalChecklistItems = job.checklists.flatMap((c) => c.items).length;
  const completedChecklistItems = job.checklists.flatMap((c) => c.items).filter((i) => i.status === "COMPLETE").length;

  const OK_MSG: Record<string, string> = {
    submitted: "Pekerjaan diajukan ke Notaris. Notaris sudah diberi tahu.",
    approved: "Pekerjaan disetujui; PIC diberi tahu untuk menyiapkan penandatanganan.",
    revision: "Permintaan revisi terkirim ke PIC.",
    edited: "Perubahan pekerjaan tersimpan."
  };
  const ERR_MSG: Record<string, string> = {
    nodraft: "Buat dan simpan draft akta dulu sebelum mengajukan ke Notaris.",
    submit: "Pekerjaan tidak bisa diajukan dari status sekarang.",
    state: "Status pekerjaan sudah berubah; muat ulang halaman.",
    note: "Tulis catatan revisi minimal 3 huruf.",
    edit: "Isian tidak valid; periksa kembali.",
    pic: "Staf yang dipilih tidak aktif."
  };
  const flashOk = searchParams?.ok ? OK_MSG[searchParams.ok] : undefined;
  const flashErr = searchParams?.err ? ERR_MSG[searchParams.err] : undefined;

  return (
    <div className="space-y-6">
      {flashOk && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm text-foreground">{flashOk}</div>
      )}
      {flashErr && (
        <div role="alert" className="rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2 text-sm text-foreground">
          {flashErr}
        </div>
      )}
      {searchParams?.portal && <PortalAccountBanner status={searchParams.portal} />}
      {(searchParams?.created === "client" || searchParams?.created === "job") && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm text-foreground">
          {searchParams.created === "client" ? `Klien ${job.client.clientNumber} dan pekerjaan` : "Pekerjaan"} {job.jobNumber} berhasil dibuat.
          Checklist dokumen sudah disiapkan sesuai layanan
          {job.pic ? `; ${job.pic.name} sudah diberi tahu dan job langsung berjalan.` : ". Tentukan PIC lewat \"Ubah pekerjaan\" agar staf mulai bekerja."}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{job.jobNumber}</p>
          <h1 className="text-xl font-semibold text-foreground">{job.description || "(Tanpa deskripsi)"}</h1>
          <Link href={`/clients/${job.client.id}`} className="text-sm text-primary hover:underline">
            {job.client.fullName} · {job.client.clientNumber}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {job.deadline ? (
            <StatusBadge tone={classifyDeadline(job.deadline, job.status)} label={`Target ${formatDate(job.deadline)}`} />
          ) : (
            <span className="text-xs text-muted-foreground">Tanpa target</span>
          )}
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
            {formatStatusLabel(job.status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Info */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Informasi Pekerjaan</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <Info label="Jenis Layanan" value={job.serviceType?.name} />
              <Info label="Status" value={formatStatusLabel(job.status)} />
              <Info label="Prioritas" value={formatStatusLabel(job.priority)} />
              <Info label="Target" value={formatDate(job.deadline)} />
              <Info label="Mulai" value={formatDateJakarta(job.startDate)} />
              <Info label="Selesai" value={formatDateJakarta(job.completionDate)} />
              <Info label="Staf (PIC)" value={job.pic?.name} />
              <Info label="Notaris" value={job.notary?.name} />
            </dl>
            {job.notes && <p className="mt-3 whitespace-pre-line rounded-md bg-muted p-3 text-sm text-muted-foreground">{job.notes}</p>}
            {isNotary && !isFinal && (
              <details className="mt-3 rounded-md border border-border">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-primary">Ubah pekerjaan (PIC, target, prioritas, catatan)</summary>
                <form action={updateJobDetails.bind(null, job.id)} className="grid grid-cols-1 gap-3 border-t border-border p-3 sm:grid-cols-3">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">Staf penanggung jawab (PIC)</span>
                    <select name="picId" defaultValue={job.picId ?? ""} className={fieldCls}>
                      <option value="">— Belum ditentukan —</option>
                      {staffOptions.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                      {job.pic && !staffOptions.some((u) => u.id === job.picId) && <option value={job.pic.id}>{job.pic.name}</option>}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">Target selesai</span>
                    <input type="date" name="deadline" defaultValue={dateInput(job.deadline)} className={fieldCls} />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">Prioritas</span>
                    <select name="priority" defaultValue={job.priority} className={fieldCls}>
                      <option value="LOW">Rendah</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">Tinggi</option>
                      <option value="URGENT">Mendesak</option>
                    </select>
                  </label>
                  <label className="text-sm sm:col-span-3">
                    <span className="mb-1 block text-xs text-muted-foreground">Keterangan</span>
                    <input name="description" defaultValue={job.description ?? ""} maxLength={500} className={fieldCls} />
                  </label>
                  <label className="text-sm sm:col-span-3">
                    <span className="mb-1 block text-xs text-muted-foreground">Catatan</span>
                    <textarea name="notes" rows={3} defaultValue={job.notes ?? ""} className={fieldCls} />
                  </label>
                  <div className="sm:col-span-3">
                    <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                      Simpan perubahan
                    </button>
                    <span className="ml-2 text-xs text-muted-foreground">PIC baru otomatis menerima notifikasi dan tugas yang belum selesai.</span>
                  </div>
                </form>
              </details>
            )}
          </Card>

          {/* Checklist */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Checklist Dokumen ({completedChecklistItems}/{totalChecklistItems})
              </h2>
            </div>
            {totalChecklistItems === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada checklist untuk job ini.</p>
            ) : (
              <div className="space-y-1.5">
                {job.checklists.flatMap((checklist) =>
                  checklist.items.map((item) => (
                    <form
                      key={item.id}
                      action={canEdit ? toggleChecklistItem.bind(null, item.id, job.id) : undefined}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                    >
                      <button
                        type="submit"
                        disabled={!canEdit}
                        className="flex items-center gap-2 text-left text-sm disabled:cursor-default"
                      >
                        <span
                          className={
                            item.status === "COMPLETE"
                              ? "flex h-4 w-4 items-center justify-center rounded border border-status-on-track bg-status-on-track text-[10px] text-white"
                              : "h-4 w-4 rounded border border-border"
                          }
                        >
                          {item.status === "COMPLETE" && "✓"}
                        </span>
                        <span className={item.status === "COMPLETE" ? "text-muted-foreground line-through" : "text-foreground"}>
                          {item.label}
                        </span>
                        {item.isRequired && item.status !== "COMPLETE" && (
                          <span className="text-[10px] font-medium text-status-overdue">wajib</span>
                        )}
                        {item.reviewStatus === "PENDING_REVIEW" && (
                          <span className="rounded-full bg-status-due-soon/10 px-2 py-0.5 text-[10px] font-medium text-status-due-soon">
                            unggahan klien · menunggu pemeriksaan
                          </span>
                        )}
                        {item.reviewStatus === "NEEDS_REVISION" && item.status !== "COMPLETE" && (
                          <span className="rounded-full bg-status-overdue/10 px-2 py-0.5 text-[10px] font-medium text-status-overdue">
                            diminta perbaikan
                          </span>
                        )}
                      </button>
                    </form>
                  ))
                )}
                {/* Pemeriksaan unggahan klien (portal) */}
                {job.checklists
                  .flatMap((c) => c.items)
                  .filter((item) => item.attachedDocument?.uploadedByClientAccountId)
                  .map((item) => (
                    <ClientUploadReview
                      key={`review-${item.id}`}
                      item={{
                        id: item.id,
                        label: item.label,
                        status: item.status,
                        reviewStatus: item.reviewStatus,
                        reviewNote: item.reviewNote,
                        document: item.attachedDocument!
                      }}
                      canReview={canEdit}
                      canViewDocuments={canViewDocuments}
                      action={reviewChecklistDocument.bind(null, item.id, job.id)}
                      aiPanel={
                        aiEnabled && canViewDocuments ? (
                          <DocumentAiPanel
                            compact
                            documentId={item.attachedDocument!.id}
                            expectedLabel={item.label}
                            returnPath={`/jobs/${job.id}`}
                            analysis={aiAnalyses.has(item.attachedDocument!.id) ? toAnalysisView(aiAnalyses.get(item.attachedDocument!.id)!) : null}
                            canAnalyze={canUploadDocuments}
                            canApply={canEditClients}
                            clientValues={{
                              nik: job.client.nik,
                              npwp: job.client.npwp,
                              address: job.client.address,
                              city: job.client.city,
                              companyName: job.client.companyName
                            }}
                          />
                        ) : null
                      }
                    />
                  ))}
              </div>
            )}
          </Card>

          {/* Draft Akta */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Draft Akta ({job.deedDrafts.length})</h2>
            {job.deedDrafts.length > 0 && (
              <ul className="mb-3 divide-y divide-border text-sm">
                {job.deedDrafts.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/jobs/${job.id}/deeds/${d.id}`} className="font-medium text-primary hover:underline">
                      {d.title ?? d.templateKey}
                      {d.deed ? <span className="ml-2 text-xs font-normal text-status-on-track">Disahkan · No. {d.deed.deedNumber}</span> : null}
                    </Link>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      diperbarui {fmtDeedTime(d.updatedAt)}
                      <a href={`/api/deeds/${d.id}/minuta`} className="text-foreground hover:underline">Minuta</a>
                      <a href={`/api/deeds/${d.id}/salinan`} className="text-status-overdue hover:underline">Salinan</a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {canEdit ? (
              (() => {
                const options = deedTemplateOptions();
                const suggested = SERVICE_CATALOG.find((c) => c.name === job.serviceType?.name)?.deedKey;
                if (options.length === 0) return null;
                if (isFinal) return null;
                const form = (
                  <form action={createDeedDraft.bind(null, job.id)} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      name="templateKey"
                      defaultValue={suggested && options.some((o) => o.key === suggested) ? suggested : options[0].key}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      {options.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.title}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                      Buat Draft Akta
                    </button>
                  </form>
                );
                // Sudah ada draft: pembuatan draft lain disembunyikan agar tidak terbuat ganda.
                return job.deedDrafts.length === 0 ? (
                  form
                ) : (
                  <details>
                    <summary className="cursor-pointer text-xs font-medium text-primary">+ Draft akta lain untuk pekerjaan ini</summary>
                    <div className="mt-2">{form}</div>
                  </details>
                );
              })()
            ) : (
              job.deedDrafts.length === 0 && <p className="text-sm text-muted-foreground">Belum ada draft akta.</p>
            )}
            {job.deeds.length > 0 && openDrafts > 0 && !isFinal && (
              <p className="mt-2 rounded-md bg-status-due-soon/10 px-3 py-2 text-xs text-foreground">
                Masih ada {openDrafts} draft belum disahkan. Pekerjaan selesai otomatis setelah semua draft disahkan; hapus draft yang tidak dipakai.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Data klien terisi otomatis; hasil berupa Word format akta kantor (Minuta hitam, Salinan merah).
            </p>
          </Card>

          {/* Tasks */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Tugas ({job.tasks.length})</h2>
            <div className="space-y-1.5">
              {job.tasks.map((task) => (
                <form
                  key={task.id}
                  action={canEdit ? toggleTaskStatus.bind(null, task.id, job.id) : undefined}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <button type="submit" disabled={!canEdit} className="flex items-center gap-2 text-left text-sm disabled:cursor-default">
                    <span
                      className={
                        task.status === "DONE"
                          ? "flex h-4 w-4 items-center justify-center rounded border border-status-on-track bg-status-on-track text-[10px] text-white"
                          : "h-4 w-4 rounded border border-border"
                      }
                    >
                      {task.status === "DONE" && "✓"}
                    </span>
                    <span className={task.status === "DONE" ? "text-muted-foreground line-through" : "text-foreground"}>
                      {task.title}
                    </span>
                  </button>
                </form>
              ))}
              {job.tasks.length === 0 && <p className="text-sm text-muted-foreground">Belum ada tugas.</p>}
            </div>

            {canEdit && (
              <form action={addJobTask.bind(null, job.id)} className="mt-3 flex gap-2 border-t border-border pt-3">
                <input
                  name="title"
                  required
                  placeholder="Tambah tugas baru..."
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
                  Tambah
                </button>
              </form>
            )}
          </Card>

          {/* Documents */}
          {canViewDocuments && (
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Dokumen ({job.documents.length})</h2>
                {canUploadDocuments && (
                  <Link href={`/documents/new?jobId=${job.id}`} className="text-xs font-medium text-primary hover:underline">
                    + Upload Dokumen
                  </Link>
                )}
              </div>
              {job.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada dokumen untuk job ini.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {job.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between py-2">
                      <Link href={`/documents/${doc.id}`} className="text-foreground hover:underline">
                        {doc.fileName}
                      </Link>
                      <span className="text-xs text-muted-foreground">{formatStatusLabel(doc.category)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Akta */}
          {canViewArchive && (
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Akta ({job.deeds.length})</h2>
                {canEditArchive && job.deedDrafts.length === 0 && (
                  <Link href={`/archive/deed/new?jobId=${job.id}`} className="text-xs font-medium text-primary hover:underline">
                    + Catat akta manual
                  </Link>
                )}
              </div>
              {job.deeds.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada akta untuk job ini.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {job.deeds.map((deed) => (
                    <li key={deed.id} className="flex items-center justify-between py-2">
                      <Link href={`/archive/deed/${deed.id}`} className="text-foreground hover:underline">
                        {deed.deedNumber} — {deed.deedType}
                      </Link>
                      <span className="text-xs text-muted-foreground">{formatDate(deed.deedDate)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Pemeriksaan Notaris */}
          {!isFinal && (
            <Card>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Pemeriksaan Notaris</h2>
              {job.status === "REVIEW" ? (
                isNotary ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Pekerjaan ini diajukan untuk Anda periksa.</p>
                    <form action={approveJobReview.bind(null, job.id)}>
                      <button type="submit" className="w-full rounded-md bg-status-on-track py-2 text-sm font-medium text-white hover:opacity-90">
                        Setujui — siap ditandatangani
                      </button>
                    </form>
                    <form action={requestJobRevision.bind(null, job.id)} className="space-y-2 border-t border-border pt-3">
                      <textarea name="note" required minLength={3} rows={3} placeholder="Apa yang perlu diperbaiki?" className={fieldCls} />
                      <button type="submit" className="w-full rounded-md border border-status-overdue/50 py-2 text-sm font-medium text-status-overdue hover:bg-status-overdue/10">
                        Minta revisi
                      </button>
                    </form>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sudah diajukan; menunggu keputusan Notaris.</p>
                )
              ) : job.status === "READY_FOR_SIGNING" ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Disetujui Notaris. {isNotary ? "Setelah ditandatangani, buka draft akta lalu klik \"Sahkan & Daftarkan\" — job otomatis selesai." : "Siapkan penandatanganan."}
                  </p>
                  {isNotary && (
                    <form action={requestJobRevision.bind(null, job.id)} className="space-y-2">
                      <textarea name="note" required minLength={3} rows={2} placeholder="Catatan revisi (bila perlu)" className={fieldCls} />
                      <button type="submit" className="w-full rounded-md border border-border py-1.5 text-xs font-medium hover:bg-muted">
                        Kembalikan untuk revisi
                      </button>
                    </form>
                  )}
                </div>
              ) : isNotary ? (
                <p className="text-sm text-muted-foreground">Menunggu staf mengajukan draft untuk Anda periksa.</p>
              ) : canEdit ? (
                <form action={submitJobForReview.bind(null, job.id)} className="space-y-2">
                  <p className="text-sm text-muted-foreground">Draft sudah siap? Ajukan ke Notaris untuk diperiksa.</p>
                  <input name="note" maxLength={500} placeholder="Catatan untuk Notaris (opsional)" className={fieldCls} />
                  <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                    Ajukan ke Notaris
                  </button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">Belum diajukan.</p>
              )}
            </Card>
          )}

          {/* Status change */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Ubah Status</h2>
            <p className="mb-2 text-xs text-muted-foreground">Status juga berubah otomatis: dokumen lengkap, diajukan, disetujui, dan akta disahkan.</p>
            {isFinal ? (
              <p className="text-sm text-muted-foreground">Job ini sudah final ({formatStatusLabel(job.status)}).</p>
            ) : canEdit && nextStatuses.length > 0 ? (
              <form action={changeJobStatusForm.bind(null, job.id)} className="space-y-2">
                <select
                  name="status"
                  defaultValue=""
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="" disabled>
                    — Pilih status baru —
                  </option>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>
                      {formatStatusLabel(s)}
                    </option>
                  ))}
                </select>
                <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Simpan Status
                </button>
              </form>
            ) : canEdit ? (
              <p className="text-sm text-muted-foreground">Tidak ada perubahan status manual yang tersedia.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Anda tidak punya akses mengubah status job ini.</p>
            )}
          </Card>

          {/* Payment */}
          {canViewFinance && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Pembayaran</h2>
                {canEditFinance && job.payments.length === 0 && (
                  <Link href={`/payments/new?jobId=${job.id}`} className="text-xs font-medium text-primary hover:underline">
                    + Catat pembayaran
                  </Link>
                )}
              </div>
              {job.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada data pembayaran untuk job ini.</p>
              ) : (
                job.payments.map((p) => (
                  <dl key={p.id} className="space-y-1.5 text-sm">
                    {canEditFinance && (
                      <div className="text-right">
                        <Link href={`/payments/${p.id}/edit`} className="text-xs font-medium text-primary hover:underline">
                          Perbarui pembayaran
                        </Link>
                      </div>
                    )}
                    <Row label="Total" value={formatCurrency(p.totalAmount)} />
                    <Row label="DP" value={formatCurrency(p.downPayment)} />
                    <Row label="Dibayar" value={formatCurrency(p.paidAmount)} />
                    <Row label="Sisa" value={formatCurrency(p.remainingAmount)} />
                    <Row label="Status" value={formatStatusLabel(p.status)} />
                  </dl>
                ))
              )}
            </Card>
          )}

          {/* Riwayat */}
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Riwayat</h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {timeline.map((t) => (
                  <li key={t.id} className="border-l-2 border-border pl-3">
                    <p className="text-foreground">{timelineLabel(t.action, t.newValue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDeedTime(t.timestamp)} · {t.user?.name ?? "Sistem"}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Kalimat riwayat yang mudah dibaca dari entri audit log. */
function timelineLabel(action: string, value: unknown): string {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const status = typeof v.status === "string" ? formatStatusLabel(v.status) : "";
  const reason = typeof v.reason === "string" ? v.reason : "";
  switch (action) {
    case "job_created":
      return "Pekerjaan dibuat";
    case "job_status_changed":
      return `Status diubah menjadi ${status}`;
    case "job_status_auto":
      return `Status otomatis: ${status}${reason ? ` (${reason})` : ""}`;
    case "job_updated":
      return "Data pekerjaan diubah";
    case "deed_draft_created":
      return "Draft akta dibuat";
    case "deed_draft_deleted":
      return "Draft akta dihapus";
    case "deed_draft_finalized":
      return `Akta disahkan${typeof v.deedNumber === "string" ? ` · No. ${v.deedNumber}` : ""}`;
    default:
      return action.replace(/_/g, " ");
  }
}

const fieldCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value?.trim() ? value : "-"}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
