import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatCurrency, formatDate, formatDateJakarta, formatStatusLabel, getJakartaToday as getJakartaTodayDate, toDateInput } from "@/lib/format";
import { getValidNextStatuses } from "@/lib/jobStatus";
import {
  addJobTask,
  approveJobReview,
  changeJobStatusForm,
  requestJobRevision,
  submitJobForReview,
  updateJobDetails,
  updateTaskDueDate,
  createCovernote,
  setPpatStage,
  reviewChecklistDocument,
  toggleChecklistItem,
  toggleTaskStatus,
  createAppointment,
  cancelAppointment,
  receiveOriginalDocument,
  returnOriginalDocument
} from "@/app/(dashboard)/jobs/actions";
import { ClientUploadReview } from "@/components/jobs/ClientUploadReview";
import { DocumentAiPanel } from "@/components/documents/DocumentAiPanel";
import { toAnalysisView } from "@/lib/ai/analysisView";
import { latestAnalysisFor } from "@/lib/ai/documentAnalysis";
import { isAiEnabled } from "@/lib/ai/client";
import { deedTemplateOptions, getDeedTemplate, variantLabels } from "@/lib/deeds/registry";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import { createDeedDraft } from "@/app/(dashboard)/jobs/[id]/deeds/actions";
import { formatDateTime as fmtDeedTime } from "@/lib/format";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PortalAccountBanner } from "@/components/clients/PortalAccountBanner";
import { draftHash, reviewState } from "@/lib/deeds/review";
import { suggestCovernoteItems } from "@/lib/covernote";
import { stagesFor } from "@/lib/ppatStages";
import { unwrapProps, type Async } from "@/lib/pageProps";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function JobDetailPage(props: Async<{
  params: { id: string };
  searchParams?: { created?: string; ok?: string; err?: string; portal?: string; doc?: string; cn?: string };
}>) {
  const { tp } = await getT();
  const {
  params,
  searchParams
} = await unwrapProps(props);
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
        select: {
          id: true,
          templateKey: true,
          title: true,
          updatedAt: true,
          data: true,
          deed: { select: { deedNumber: true } },
          ppatDeed: { select: { deedNumber: true } },
          reviews: { orderBy: { sharedAt: "desc" }, take: 1, select: { dataHash: true, decision: true } }
        }
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
      deeds: { orderBy: { createdAt: "desc" } },
      ppatDeeds: { orderBy: { createdAt: "desc" }, select: { id: true, deedNumber: true, deedType: true, deedDate: true, submittedToBpnAt: true } },
      ppatStages: true
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
          !((job.status === "REVIEW" || job.status === "READY_FOR_SIGNING") && s === "IN_PROGRESS") &&
          // Masih ada draft akta yang belum disahkan: "Selesai" lewat Sahkan & Daftarkan, bukan manual.
          !(s === "COMPLETED" && job.deedDrafts.some((d) => !d.deed && !d.ppatDeed))
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
  const openDrafts = job.deedDrafts.filter((d) => !d.deed && !d.ppatDeed).length;
  const isPpatService = !!SERVICE_CATALOG.find((c) => c.name === job.serviceType?.name)?.ppatType;
  const ppatStageDefs = stagesFor(job.ppatDeeds[0]?.deedType ?? SERVICE_CATALOG.find((c) => c.name === job.serviceType?.name)?.ppatType);
  const stageDone = new Map(job.ppatStages.map((st) => [st.step, st]));
  const nextStage = ppatStageDefs.find((d) => !stageDone.has(d.key));
  const covernoteItems = isNotary ? await suggestCovernoteItems(job.id) : [];
  // Jadwal tanda tangan / pertemuan untuk pekerjaan ini (yang akan datang dulu).
  const appointments = await prisma.appointment.findMany({ where: { jobId: job.id }, orderBy: [{ date: "asc" }, { time: "asc" }] });
  const todayStart = getJakartaTodayDate();
  // Dokumen asli klien yang dititipkan ke kantor untuk pekerjaan ini.
  const originals = await prisma.originalDocument.findMany({ where: { jobId: job.id }, orderBy: { receivedAt: "asc" } });

  // Riwayat pekerjaan dari audit log (status, draft akta, pengesahan).
  const timeline = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Job", entityId: job.id },
        { entityType: "DeedDraft", entityId: { in: job.deedDrafts.map((d) => d.id) } },
        { entityType: "Deed", entityId: { in: job.deeds.map((d) => d.id) } },
        { entityType: "PpatDeed", entityId: { in: job.ppatDeeds.map((d) => d.id) } }
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
    edited: "Perubahan pekerjaan tersimpan.",
    covernote: `Covernote ${searchParams?.cn ?? ""} dibuat dan tersimpan di Document Vault.`
  };
  const ERR_MSG: Record<string, string> = {
    nodraft: "Buat dan simpan draft akta dulu sebelum mengajukan ke Notaris.",
    submit: "Pekerjaan tidak bisa diajukan dari status sekarang.",
    state: "Status pekerjaan sudah berubah; muat ulang halaman.",
    note: "Tulis catatan revisi minimal 3 huruf.",
    edit: "Isian tidak valid; periksa kembali.",
    pic: "Staf yang dipilih tidak aktif.",
    covernote: "Isi nama bank, nama debitur, dan minimal satu uraian."
  };
  const flashOk = searchParams?.ok ? OK_MSG[searchParams.ok] : undefined;
  const flashErr = searchParams?.err ? ERR_MSG[searchParams.err] : undefined;

  return (
    <div className="space-y-6">
      {flashOk && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm text-foreground">
          {flashOk}
          {searchParams?.ok === "covernote" && searchParams.doc && (
            <>
              {" "}
              <a href={`/api/documents/${searchParams.doc}/download`} className="font-medium text-primary hover:underline">
                {tp("Unduh covernote")}
              </a>
            </>
          )}
        </div>
      )}
      {flashErr && (
        <div role="alert" className="rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2 text-sm text-foreground">
          {flashErr}
        </div>
      )}
      {searchParams?.portal && <PortalAccountBanner status={searchParams.portal} />}
      {(searchParams?.created === "client" || searchParams?.created === "job") && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm text-foreground">
          {searchParams.created === "client" ? tp("Klien {0} dan pekerjaan", [job.client.clientNumber]) : tp("Pekerjaan")} {job.jobNumber} {tp("berhasil dibuat. Checklist dokumen sudah disiapkan sesuai layanan")}
          {job.pic ? tp("; {0} sudah diberi tahu dan pekerjaan langsung berjalan.", [job.pic.name]) : tp(". Tentukan PIC lewat \"Ubah pekerjaan\" agar staf mulai bekerja.")}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{job.jobNumber}</p>
          <h1 className="break-words text-2xl font-extrabold tracking-tight text-foreground">{job.description || tp("(Tanpa deskripsi)")}</h1>
          <Link href={`/clients/${job.client.id}`} className="text-sm text-primary hover:underline">
            {job.client.fullName} · {job.client.clientNumber}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {job.deadline ? (
            <StatusBadge tone={classifyDeadline(job.deadline, job.status)} label={tp("Target {0}", [formatDate(job.deadline)])} />
          ) : (
            <span className="text-xs text-muted-foreground">{tp("Tanpa target")}</span>
          )}
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
            {tp(formatStatusLabel(job.status))}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Info */}
          <Card>
            <h2 className="mb-3 text-base font-bold text-foreground">{tp("Informasi Pekerjaan")}</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <Info label={tp("Jenis Layanan")} value={job.serviceType?.name} />
              <Info label={tp("Status")} value={tp(formatStatusLabel(job.status))} />
              <Info label={tp("Prioritas")} value={tp(formatStatusLabel(job.priority))} />
              <Info label={tp("Target")} value={formatDate(job.deadline)} />
              <Info label={tp("Mulai")} value={formatDateJakarta(job.startDate)} />
              <Info label={tp("Selesai")} value={formatDateJakarta(job.completionDate)} />
              <Info label={tp("Staf (PIC)")} value={job.pic?.name} />
              <Info label={tp("Notaris")} value={job.notary?.name} />
            </dl>
            {job.notes && <p className="mt-3 whitespace-pre-line rounded-md bg-muted p-3 text-sm text-muted-foreground">{job.notes}</p>}
            {isNotary && !isFinal && (
              <details className="mt-3 rounded-md border border-border">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-primary">{tp("Ubah pekerjaan (PIC, target, prioritas, catatan)")}</summary>
                <form action={updateJobDetails.bind(null, job.id)} className="grid grid-cols-1 gap-3 border-t border-border p-3 sm:grid-cols-3">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Staf penanggung jawab (PIC)")}</span>
                    <select name="picId" defaultValue={job.picId ?? ""} className={fieldCls}>
                      <option value="">{tp("— Belum ditentukan —")}</option>
                      {staffOptions.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                      {job.pic && !staffOptions.some((u) => u.id === job.picId) && <option value={job.pic.id}>{job.pic.name}</option>}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Target selesai")}</span>
                    <input type="date" name="deadline" defaultValue={dateInput(job.deadline)} className={fieldCls} />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Prioritas")}</span>
                    <select name="priority" defaultValue={job.priority} className={fieldCls}>
                      <option value="LOW">{tp("Rendah")}</option>
                      <option value="NORMAL">{tp("Normal")}</option>
                      <option value="HIGH">{tp("Tinggi")}</option>
                      <option value="URGENT">{tp("Mendesak")}</option>
                    </select>
                  </label>
                  <label className="text-sm sm:col-span-3">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Keterangan")}</span>
                    <input name="description" defaultValue={job.description ?? ""} maxLength={500} className={fieldCls} />
                  </label>
                  <label className="text-sm sm:col-span-3">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Catatan")}</span>
                    <textarea name="notes" rows={3} defaultValue={job.notes ?? ""} className={fieldCls} />
                  </label>
                  <div className="sm:col-span-3">
                    <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                      {tp("Simpan perubahan")}
                    </button>
                    <span className="ml-2 text-xs text-muted-foreground">{tp("PIC baru otomatis menerima notifikasi dan tugas yang belum selesai.")}</span>
                  </div>
                </form>
              </details>
            )}
          </Card>

          {/* Checklist */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-foreground">
                {tp("Checklist Dokumen (")}{completedChecklistItems}/{totalChecklistItems})
              </h2>
            </div>
            {totalChecklistItems === 0 ? (
              <p className="text-sm text-muted-foreground">{tp("Tidak ada checklist untuk pekerjaan ini.")}</p>
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
                        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-left text-sm disabled:cursor-default"
                      >
                        <span
                          className={
                            item.status === "COMPLETE"
                              ? "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-status-on-track bg-status-on-track text-[10px] text-background"
                              : "h-4 w-4 shrink-0 rounded border border-border"
                          }
                        >
                          {item.status === "COMPLETE" && "✓"}
                        </span>
                        <span className={item.status === "COMPLETE" ? "text-muted-foreground line-through" : "text-foreground"}>
                          {item.label}
                        </span>
                        {item.isRequired && item.status !== "COMPLETE" && (
                          <span className="text-[10px] font-medium text-status-overdue">{tp("wajib")}</span>
                        )}
                        {item.reviewStatus === "PENDING_REVIEW" && (
                          <span className="rounded-full bg-status-due-soon/10 px-2 py-0.5 text-[10px] font-medium text-status-due-soon">
                            {tp("unggahan klien · menunggu pemeriksaan")}
                          </span>
                        )}
                        {item.reviewStatus === "NEEDS_REVISION" && item.status !== "COMPLETE" && (
                          <span className="rounded-full bg-status-overdue/10 px-2 py-0.5 text-[10px] font-medium text-status-overdue">
                            {tp("diminta perbaikan")}
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
            <h2 className="mb-3 text-base font-bold text-foreground">{tp("Draft Akta (")}{job.deedDrafts.length})</h2>
            {job.deedDrafts.length > 0 && (
              <ul className="mb-3 divide-y divide-border text-sm">
                {job.deedDrafts.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/jobs/${job.id}/deeds/${d.id}`} className="font-medium text-primary hover:underline">
                      {d.title ?? d.templateKey}
                      {d.deed ? <span className="ml-2 text-xs font-normal text-status-on-track">{tp("Disahkan · No.")} {d.deed.deedNumber}</span> : null}
                      {d.ppatDeed ? <span className="ml-2 text-xs font-normal text-status-on-track">{tp("Disahkan · Akta PPAT No.")} {d.ppatDeed.deedNumber}</span> : null}
                      {!d.deed && !d.ppatDeed &&
                        (() => {
                          const st = reviewState(d.reviews[0], draftHash(d.data));
                          const map: Record<string, [string, string] | null> = {
                            none: null,
                            waiting: ["menunggu klien", "text-muted-foreground"],
                            approved: ["klien setuju", "text-status-on-track"],
                            changes: ["klien minta koreksi", "text-status-overdue"],
                            outdated: ["perlu dibagikan ulang ke klien", "text-status-due-soon"]
                          };
                          const v = map[st];
                          return v ? <span className={`ml-2 text-xs font-normal ${v[1]}`}>· {v[0]}</span> : null;
                        })()}
                    </Link>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {tp("diperbarui")} {fmtDeedTime(d.updatedAt)}
                      <a href={`/api/deeds/${d.id}/minuta`} className="text-foreground hover:underline">{variantLabels(getDeedTemplate(d.templateKey)).minuta}</a>
                      <a href={`/api/deeds/${d.id}/salinan`} className="text-status-overdue hover:underline">{variantLabels(getDeedTemplate(d.templateKey)).salinan}</a>
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
                      {tp("Buat Draft Akta")}
                    </button>
                  </form>
                );
                // Sudah ada draft: pembuatan draft lain disembunyikan agar tidak terbuat ganda.
                return job.deedDrafts.length === 0 ? (
                  form
                ) : (
                  <details>
                    <summary className="cursor-pointer text-xs font-medium text-primary">{tp("+ Draft akta lain untuk pekerjaan ini")}</summary>
                    <div className="mt-2">{form}</div>
                  </details>
                );
              })()
            ) : (
              job.deedDrafts.length === 0 && <p className="text-sm text-muted-foreground">{tp("Belum ada draft akta.")}</p>
            )}
            {(job.deeds.length > 0 || job.ppatDeeds.length > 0) && openDrafts > 0 && !isFinal && (
              <p className="mt-2 rounded-md bg-status-due-soon/10 px-3 py-2 text-xs text-foreground">
                {tp("Masih ada")} {openDrafts} {tp("draft belum disahkan. Pekerjaan selesai otomatis setelah semua draft disahkan; hapus draft yang tidak dipakai.")}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {tp("Data klien terisi otomatis; hasil berupa Word format akta kantor (Minuta hitam, Salinan merah).")}
            </p>
          </Card>

          {/* Tasks */}
          <Card>
            <h2 className="mb-3 text-base font-bold text-foreground">{tp("Tugas (")}{job.tasks.length})</h2>
            <div className="space-y-1.5">
              {job.tasks.map((task) => (
                <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                <form action={canEdit ? toggleTaskStatus.bind(null, task.id, job.id) : undefined} className="min-w-0 flex-1">
                  <button type="submit" disabled={!canEdit} className="flex min-w-0 items-center gap-2 text-left text-sm disabled:cursor-default">
                    <span
                      className={
                        task.status === "DONE"
                          ? "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-status-on-track bg-status-on-track text-[10px] text-background"
                          : "h-4 w-4 shrink-0 rounded border border-border"
                      }
                    >
                      {task.status === "DONE" && "✓"}
                    </span>
                    <span className={task.status === "DONE" ? "text-muted-foreground line-through" : "text-foreground"}>
                      {task.title}
                    </span>
                  </button>
                </form>
                {task.dueDate && task.status !== "DONE" && !isNotary && (
                  <StatusBadge tone={classifyDeadline(task.dueDate, "OPEN")} label={tp("Tenggat {0}", [formatDate(task.dueDate)])} />
                )}
                {isNotary && task.status !== "DONE" && (
                  // Notaris dapat mengatur / menyesuaikan tenggat tugas.
                  <form action={updateTaskDueDate.bind(null, task.id, job.id)} className="flex flex-wrap items-center gap-1">
                    {task.dueDate && <StatusBadge tone={classifyDeadline(task.dueDate, "OPEN")} label={formatDate(task.dueDate)} />}
                    <input type="date" name="dueDate" defaultValue={toDateInput(task.dueDate)} className="rounded border border-border bg-background px-1.5 py-0.5 text-xs" />
                    <button type="submit" className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-muted">
                      {tp("Simpan")}
                    </button>
                  </form>
                )}
                </div>
              ))}
              {job.tasks.length === 0 && <p className="text-sm text-muted-foreground">{tp("Belum ada tugas.")}</p>}
            </div>

            {canEdit && (
              <form action={addJobTask.bind(null, job.id)} className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 sm:flex-nowrap">
                <input
                  name="title"
                  required
                  placeholder={tp("Tambah tugas baru...")}
                  className="min-w-0 flex-1 basis-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:basis-0"
                />
                <input
                  type="date"
                  name="dueDate"
                  title={tp("Tenggat (opsional)")}
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground sm:w-36 sm:flex-none"
                />
                <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
                  {tp("Tambah")}
                </button>
              </form>
            )}
          </Card>

          {/* Jadwal */}
          <Card>
            <h2 className="mb-1 text-base font-bold text-foreground">{tp("Jadwal (")}{appointments.length})</h2>
            <p className="mb-2 text-xs text-muted-foreground">{tp("Jadwal tanda tangan atau pertemuan. Tampil di Kalender; klien diberi tahu lewat portal.")}</p>
            <div className="divide-y divide-border">
              {appointments.map((a) => {
                const past = a.date.getTime() < todayStart.getTime();
                return (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className={past ? "text-muted-foreground" : "font-medium text-foreground"}>
                        {a.type === "signing" ? tp("Tanda tangan akta") : a.type === "follow-up" ? tp("Tindak lanjut") : tp("Pertemuan")} · {formatDate(a.date)}
                        {a.time ? tp(" · {0} WIB", [a.time]) : ""}
                        {past ? " (lewat)" : ""}
                      </p>
                      {a.notes && <p className="break-words text-xs text-muted-foreground">{a.notes}</p>}
                    </div>
                    {canEdit && !past && (
                      <form action={cancelAppointment.bind(null, a.id)}>
                        <ConfirmButton message={tp("Batalkan jadwal ini? Klien akan diberi tahu lewat portal.")} className="text-xs text-status-overdue hover:underline">
                          {tp("Batalkan")}
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                );
              })}
              {appointments.length === 0 && <p className="py-2.5 text-sm text-muted-foreground">{tp("Belum ada jadwal.")}</p>}
            </div>
            {canEdit && !isFinal && (
              <form action={createAppointment.bind(null, job.id)} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                <label className="w-full sm:w-44">
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Jenis")}</span>
                  <select name="type" defaultValue="signing" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground">
                    <option value="signing">{tp("Tanda tangan akta")}</option>
                    <option value="meeting">{tp("Pertemuan")}</option>
                    <option value="follow-up">{tp("Tindak lanjut")}</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Tanggal")}</span>
                  <input type="date" name="date" required min={toDateInput(todayStart)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
                </label>
                <label>
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Jam")}</span>
                  <input type="time" name="time" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
                </label>
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Catatan (opsional)")}</span>
                  <input name="notes" maxLength={300} placeholder={tp("mis. bawa KTP & sertipikat asli")} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
                </label>
                <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
                  {tp("Jadwalkan")}
                </button>
              </form>
            )}
          </Card>

          {/* Dokumen asli */}
          <Card>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-foreground">
                {tp("Dokumen Asli Dititipkan (")}{originals.filter((o) => !o.returnedAt).length} {tp("masih di kantor)")}
              </h2>
              {originals.length > 0 && (
                <a href={`/api/jobs/${job.id}/tanda-terima`} className="text-xs font-medium text-primary hover:underline">
                  {tp("Unduh tanda terima (Word)")}
                </a>
              )}
            </div>
            <p className="mb-2 text-xs text-muted-foreground">{tp("Sertipikat, BPKB, dan surat asli lain yang diterima dari klien. Catat saat diterima dan saat dikembalikan.")}</p>
            <div className="divide-y divide-border">
              {originals.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-foreground">{o.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {tp("Diterima::dok")} {formatDate(o.receivedAt)}
                      {o.receivedFrom ? tp(" dari {0}", [o.receivedFrom]) : ""}
                      {o.notes ? ` · ${o.notes}` : ""}
                    </p>
                  </div>
                  {o.returnedAt ? (
                    <span className="text-xs text-status-on-track">
                      {tp("Dikembalikan::dok")} {formatDate(o.returnedAt)}
                      {o.returnedTo ? tp(" kepada {0}", [o.returnedTo]) : ""}
                    </span>
                  ) : canEdit ? (
                    <form action={returnOriginalDocument.bind(null, o.id)} className="flex flex-wrap items-center gap-2">
                      <input name="returnedTo" required minLength={2} maxLength={120} placeholder={tp("Dikembalikan kepada")} className="w-44 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground" />
                      <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted">
                        {tp("Tandai dikembalikan")}
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-status-due-soon">{tp("Masih di kantor")}</span>
                  )}
                </div>
              ))}
              {originals.length === 0 && <p className="py-2.5 text-sm text-muted-foreground">{tp("Belum ada dokumen asli yang dicatat.")}</p>}
            </div>
            {canEdit && (
              <form action={receiveOriginalDocument.bind(null, job.id)} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Dokumen asli")}</span>
                  <input name="description" required minLength={3} maxLength={300} placeholder={tp("mis. Sertipikat Hak Milik Nomor 123/Babakan")} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
                </label>
                <label>
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Diterima dari")}</span>
                  <input name="receivedFrom" maxLength={120} className="w-40 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
                </label>
                <label>
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Tanggal")}</span>
                  <input type="date" name="receivedAt" defaultValue={toDateInput(todayStart)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
                </label>
                <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
                  {tp("Catat diterima")}
                </button>
              </form>
            )}
          </Card>

          {/* Documents */}
          {canViewDocuments && (
            <Card>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-foreground">{tp("Dokumen (")}{job.documents.length})</h2>
                {canUploadDocuments && (
                  <Link href={`/documents/new?jobId=${job.id}`} className="text-xs font-medium text-primary hover:underline">
                    {tp("+ Upload Dokumen")}
                  </Link>
                )}
              </div>
              {job.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tp("Belum ada dokumen untuk pekerjaan ini.")}</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {job.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-3 py-2">
                      <Link href={`/documents/${doc.id}`} className="min-w-0 break-all text-foreground hover:underline">
                        {doc.fileName}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">{tp(formatStatusLabel(doc.category))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Proses PPAT */}
          {ppatStageDefs.length > 0 && (
            <Card>
              <h2 className="mb-3 text-base font-bold text-foreground">
                {tp("Proses PPAT (")}{ppatStageDefs.filter((d) => stageDone.has(d.key)).length}/{ppatStageDefs.length})
              </h2>
              <ol className="space-y-2">
                {ppatStageDefs.map((d, i) => {
                  const done = stageDone.get(d.key);
                  const isNext = nextStage?.key === d.key;
                  return (
                    <li key={d.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span
                          className={
                            done
                              ? "flex h-5 w-5 items-center justify-center rounded-full bg-status-on-track text-[11px] text-background"
                              : isNext
                                ? "flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary text-[11px] text-primary"
                                : "flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground"
                          }
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        <span className={done ? "text-foreground" : isNext ? "font-medium text-foreground" : "text-muted-foreground"}>{d.label}</span>
                        {done && (
                          <span className="text-xs text-muted-foreground">
                            {formatDateJakarta(done.doneAt)}
                            {done.reference ? ` · ${done.reference}` : ""}
                          </span>
                        )}
                      </span>
                      {canEdit && !done && isNext && d.key !== "TANDA_TANGAN" && (
                        <form action={setPpatStage.bind(null, job.id, d.key)} className="flex flex-wrap items-center gap-1">
                          {d.refLabel && <input name="reference" placeholder={d.refLabel} className="w-40 rounded border border-border bg-background px-2 py-1 text-xs" />}
                          <input type="date" name="date" defaultValue={toDateInput(getJakartaTodayDate())} className="rounded border border-border bg-background px-2 py-1 text-xs" />
                          <button type="submit" className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">
                            {tp("Selesai")}
                          </button>
                        </form>
                      )}
                      {isNotary && done && (
                        <form action={setPpatStage.bind(null, job.id, d.key)}>
                          <input type="hidden" name="undo" value="1" />
                          <button type="submit" className="text-xs text-muted-foreground hover:text-status-overdue">
                            {tp("batalkan")}
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p className="mt-2 text-xs text-muted-foreground">
                {tp("Tanda tangan & penyampaian ke BPN tercentang otomatis dari Buku Akta PPAT. Tahap yang tertahan diingatkan setiap pagi; klien melihat kemajuannya di portal.")}
              </p>
            </Card>
          )}

          {/* Akta PPAT (layanan selaku PPAT) */}
          {canViewArchive && (isPpatService || job.ppatDeeds.length > 0) && (
            <Card>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-foreground">{tp("Akta PPAT (")}{job.ppatDeeds.length})</h2>
                {canEditArchive && !isFinal && (
                  <Link href={`/ppat/new?jobId=${job.id}`} className="text-xs font-medium text-primary hover:underline">
                    {tp("+ Daftarkan akta PPAT")}
                  </Link>
                )}
              </div>
              {job.ppatDeeds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {tp("Setelah akta ditandatangani, daftarkan di sini: nomor PPAT otomatis, tugas ke Kantor Pertanahan (7 hari kerja) dibuat, dan pekerjaan selesai.")}
                </p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {job.ppatDeeds.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                      <Link href={`/ppat/${p.id}`} className="min-w-0 break-words text-foreground hover:underline">
                        {p.deedNumber} — {p.deedType}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(p.deedDate)} · {p.submittedToBpnAt ? tp("sudah ke BPN") : tp("belum ke BPN")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Covernote ke bank (Notaris/PPAT) */}
          {isNotary && (isPpatService || job.ppatDeeds.length > 0 || job.deeds.length > 0) && (
            <Card>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-foreground">{tp("Covernote ke bank")}</summary>
                <form action={createCovernote.bind(null, job.id)} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Kepada (bank & cabang)")}</span>
                    <input name="bank" required placeholder={tp("mis. PT Bank Mandiri (Persero) Tbk. KCP Bogor Pajajaran")} className={fieldCls} />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Alamat bank (opsional)")}</span>
                    <input name="bankAddress" className={fieldCls} />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Nama debitur")}</span>
                    <input name="debtor" required defaultValue={job.client.fullName} className={fieldCls} />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Perkiraan penyerahan sertipikat")}</span>
                    <input name="estimate" type="date" className={fieldCls} />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Uraian (satu poin per baris; terisi dari akta pekerjaan ini)")}</span>
                    <textarea name="items" rows={6} required defaultValue={covernoteItems.join("\n")} className={fieldCls} />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block text-xs text-muted-foreground">{tp("Catatan tambahan (opsional)")}</span>
                    <input name="note" className={fieldCls} />
                  </label>
                  <div className="sm:col-span-2">
                    <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                      {tp("Buat covernote (Word)")}
                    </button>
                    <span className="ml-2 text-xs text-muted-foreground">{tp("Nomor otomatis; file tersimpan di Dokumen pekerjaan ini.")}</span>
                  </div>
                </form>
              </details>
            </Card>
          )}

          {/* Akta */}
          {canViewArchive && (
            <Card>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-foreground">{tp("Akta (")}{job.deeds.length})</h2>
                {canEditArchive && job.deedDrafts.length === 0 && (
                  <Link href={`/archive/deed/new?jobId=${job.id}`} className="text-xs font-medium text-primary hover:underline">
                    {tp("+ Catat akta manual")}
                  </Link>
                )}
              </div>
              {job.deeds.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tp("Belum ada akta untuk pekerjaan ini.")}</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {job.deeds.map((deed) => (
                    <li key={deed.id} className="flex items-center justify-between gap-3 py-2">
                      <Link href={`/archive/deed/${deed.id}`} className="min-w-0 break-words text-foreground hover:underline">
                        {deed.deedNumber} — {deed.deedType}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(deed.deedDate)}</span>
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
              <h2 className="mb-2 text-base font-bold text-foreground">{tp("Pemeriksaan Notaris")}</h2>
              {job.status === "REVIEW" ? (
                isNotary ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{tp("Pekerjaan ini diajukan untuk Anda periksa.")}</p>
                    <form action={approveJobReview.bind(null, job.id)}>
                      <button type="submit" className="w-full rounded-md bg-status-on-track py-2 text-sm font-medium text-background hover:opacity-90">
                        {tp("Setujui — siap ditandatangani")}
                      </button>
                    </form>
                    <form action={requestJobRevision.bind(null, job.id)} className="space-y-2 border-t border-border pt-3">
                      <textarea name="note" required minLength={3} rows={3} placeholder={tp("Apa yang perlu diperbaiki?")} className={fieldCls} />
                      <button type="submit" className="w-full rounded-md border border-status-overdue/50 py-2 text-sm font-medium text-status-overdue hover:bg-status-overdue/10">
                        {tp("Minta revisi")}
                      </button>
                    </form>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{tp("Sudah diajukan; menunggu keputusan Notaris.")}</p>
                )
              ) : job.status === "READY_FOR_SIGNING" ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {tp("Disetujui Notaris.")} {isNotary ? tp("Setelah ditandatangani, buka draft akta lalu klik \"Sahkan & Daftarkan\" — pekerjaan otomatis selesai.") : tp("Siapkan penandatanganan.")}
                  </p>
                  {isNotary && (
                    <form action={requestJobRevision.bind(null, job.id)} className="space-y-2">
                      <textarea name="note" required minLength={3} rows={2} placeholder={tp("Catatan revisi (bila perlu)")} className={fieldCls} />
                      <button type="submit" className="w-full rounded-md border border-border py-1.5 text-xs font-medium hover:bg-muted">
                        {tp("Kembalikan untuk revisi")}
                      </button>
                    </form>
                  )}
                </div>
              ) : isNotary ? (
                <p className="text-sm text-muted-foreground">{tp("Menunggu staf mengajukan draft untuk Anda periksa.")}</p>
              ) : canEdit ? (
                <form action={submitJobForReview.bind(null, job.id)} className="space-y-2">
                  <p className="text-sm text-muted-foreground">{tp("Draft sudah siap? Ajukan ke Notaris untuk diperiksa.")}</p>
                  <input name="note" maxLength={500} placeholder={tp("Catatan untuk Notaris (opsional)")} className={fieldCls} />
                  <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                    {tp("Ajukan ke Notaris")}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">{tp("Belum diajukan.")}</p>
              )}
            </Card>
          )}

          {/* Status change */}
          <Card>
            <h2 className="mb-3 text-base font-bold text-foreground">{tp("Ubah Status")}</h2>
            <p className="mb-2 text-xs text-muted-foreground">{tp("Status juga berubah otomatis: dokumen lengkap, diajukan, disetujui, dan akta disahkan.")}</p>
            {isFinal ? (
              <p className="text-sm text-muted-foreground">{tp("Job ini sudah final (")}{tp(formatStatusLabel(job.status))}).</p>
            ) : canEdit && nextStatuses.length > 0 ? (
              <form action={changeJobStatusForm.bind(null, job.id)} className="space-y-2">
                <select
                  name="status"
                  defaultValue=""
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="" disabled>
                    {tp("— Pilih status baru —")}
                  </option>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>
                      {tp(formatStatusLabel(s))}
                    </option>
                  ))}
                </select>
                <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  {tp("Simpan Status")}
                </button>
              </form>
            ) : canEdit ? (
              <p className="text-sm text-muted-foreground">{tp("Tidak ada perubahan status manual yang tersedia.")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{tp("Anda tidak punya akses mengubah status pekerjaan ini.")}</p>
            )}
          </Card>

          {/* Payment */}
          {canViewFinance && (
            <Card>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-foreground">{tp("Pembayaran")}</h2>
                {canEditFinance && job.payments.length === 0 && (
                  <Link href={`/payments/new?jobId=${job.id}`} className="text-xs font-medium text-primary hover:underline">
                    {tp("+ Buat tagihan")}
                  </Link>
                )}
              </div>
              {job.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tp("Belum ada data pembayaran untuk pekerjaan ini.")}</p>
              ) : (
                job.payments.map((p) => (
                  <dl key={p.id} className="space-y-1.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{p.invoiceNumber ?? tp("Tagihan")}</span>
                      <Link href={`/payments/${p.id}`} className="text-xs font-medium text-primary hover:underline">
                        {canEditFinance ? tp("Catat bayar / kuitansi") : tp("Detail")}
                      </Link>
                    </div>
                    <Row label={tp("Total")} value={formatCurrency(p.totalAmount)} />
                    <Row label={tp("DP")} value={formatCurrency(p.downPayment)} />
                    <Row label={tp("Dibayar")} value={formatCurrency(p.paidAmount)} />
                    <Row label={tp("Sisa")} value={formatCurrency(p.remainingAmount)} />
                    <Row label={tp("Status")} value={tp(formatStatusLabel(p.status))} />
                  </dl>
                ))
              )}
            </Card>
          )}

          {/* Riwayat */}
          <Card>
            <h2 className="mb-2 text-base font-bold text-foreground">{tp("Riwayat")}</h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tp("Belum ada riwayat.")}</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {timeline.map((t) => (
                  <li key={t.id} className="border-l-2 border-border pl-3">
                    <p className="text-foreground">{timelineLabel(t.action, t.newValue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDeedTime(t.timestamp)} · {t.user?.name ?? tp("Sistem")}
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

const STAGE_LABELS: Record<string, string> = {
  CEK_SERTIFIKAT: "Cek sertipikat",
  VALIDASI_PPH: "Validasi PPh",
  VALIDASI_BPHTB: "Validasi BPHTB",
  TANDA_TANGAN: "Penandatanganan akta",
  KE_BPN: "Penyampaian ke Kantor Pertanahan",
  SERTIFIKAT_SELESAI: "Sertipikat selesai",
  SERTIFIKAT_HT_TERBIT: "Sertipikat Hak Tanggungan terbit",
  APHT_DIBUAT: "Ditindaklanjuti dengan APHT"
};
const stageLabel = (step: unknown) => (typeof step === "string" ? STAGE_LABELS[step] ?? step : "");

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
    case "covernote_issued":
      return `Covernote ${typeof v.number === "string" ? v.number : ""} dibuat${typeof v.bank === "string" ? ` untuk ${v.bank}` : ""}`;
    case "covernote_saved":
      return `File covernote ${typeof v.number === "string" ? v.number : ""} disimpan di Dokumen`;
    case "ppat_stage_done":
      return `Tahap PPAT selesai: ${stageLabel(v.step)}${typeof v.reference === "string" && v.reference ? ` (${v.reference})` : ""}`;
    case "ppat_stage_undone":
      return `Tahap PPAT dibatalkan: ${stageLabel(v.step)}`;
    case "ppat_submitted_bpn":
      return "Akta PPAT disampaikan ke Kantor Pertanahan";
    case "deed_draft_shared":
      return "Draft akta dibagikan ke klien untuk diperiksa";
    case "deed_draft_updated":
      return "Draft akta diubah";
    case "deed_created":
      return "Akta dicatat di Lemari Arsip";
    case "deed_status_changed":
      return "Status akta diubah";
    case "deed_archived":
      return "Akta diarsipkan";
    case "deed_restored":
      return "Akta dipulihkan dari arsip";
    case "ppat_deed_updated":
      return "Data akta PPAT diubah";
    case "ppat_deed_registered":
      return `Akta PPAT ${typeof v.deedNumber === "string" ? v.deedNumber : ""} didaftarkan`;
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
