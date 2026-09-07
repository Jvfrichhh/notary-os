import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatCurrency, formatDate, formatStatusLabel } from "@/lib/format";
import { getValidNextStatuses } from "@/lib/jobStatus";
import {
  addJobTask,
  changeJobStatusForm,
  toggleChecklistItem,
  toggleTaskStatus
} from "@/app/(dashboard)/jobs/actions";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.VIEW_JOBS);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_JOBS);
  const canViewFinance = await userHasPermission(user.id, PERMISSIONS.VIEW_FINANCE);
  const canViewDocuments = await userHasPermission(user.id, PERMISSIONS.VIEW_DOCUMENTS);
  const canUploadDocuments = await userHasPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);
  const canViewArchive = await userHasPermission(user.id, PERMISSIONS.VIEW_MINUTA);
  const canEditArchive = await userHasPermission(user.id, PERMISSIONS.EDIT_MINUTA);

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      serviceType: true,
      pic: true,
      assistant: true,
      reviewer: true,
      notary: true,
      visit: true,
      tasks: { orderBy: { createdAt: "asc" } },
      checklists: { include: { items: true } },
      payments: true,
      documents: true,
      deeds: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!job) notFound();

  const nextStatuses = getValidNextStatuses(job.status);
  const totalChecklistItems = job.checklists.flatMap((c) => c.items).length;
  const completedChecklistItems = job.checklists.flatMap((c) => c.items).filter((i) => i.status === "COMPLETE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{job.jobNumber}</p>
          <h1 className="text-xl font-semibold text-foreground">{job.description || "(Tanpa deskripsi)"}</h1>
          <Link href={`/clients/${job.client.id}`} className="text-sm text-primary hover:underline">
            {job.client.fullName} · {job.client.clientNumber}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={classifyDeadline(job.deadline, job.status)} label={formatDate(job.deadline)} />
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
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Info label="Jenis Layanan" value={job.serviceType?.name} />
              <Info label="Prioritas" value={formatStatusLabel(job.priority)} />
              <Info label="Deadline" value={formatDate(job.deadline)} />
              <Info label="Mulai" value={formatDate(job.startDate)} />
              <Info label="Selesai" value={formatDate(job.completionDate)} />
              <Info label="PIC" value={job.pic?.name} />
              <Info label="Reviewer" value={job.reviewer?.name} />
              <Info label="Notaris" value={job.notary?.name} />
              {job.visit && (
                <div>
                  <dt className="text-xs text-muted-foreground">Dari Kunjungan</dt>
                  <dd>
                    <Link href={`/visits/${job.visit.id}`} className="text-sm text-primary hover:underline">
                      Lihat kunjungan
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
            {job.notes && <p className="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">{job.notes}</p>}
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
                      </button>
                    </form>
                  ))
                )}
              </div>
            )}
          </Card>

          {/* Tasks */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Tasks ({job.tasks.length})</h2>
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
              {job.tasks.length === 0 && <p className="text-sm text-muted-foreground">Belum ada task.</p>}
            </div>

            {canEdit && (
              <form action={addJobTask.bind(null, job.id)} className="mt-3 flex gap-2 border-t border-border pt-3">
                <input
                  name="title"
                  required
                  placeholder="Tambah task baru..."
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
                {canEditArchive && (
                  <Link href={`/archive/deed/new?jobId=${job.id}`} className="text-xs font-medium text-primary hover:underline">
                    + Tambah Akta
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
          {/* Status change */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Ubah Status</h2>
            {job.status === "COMPLETED" || job.status === "CANCELLED" ? (
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
                  Update Status
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Anda tidak punya akses mengubah status job ini.</p>
            )}
          </Card>

          {/* Payment */}
          {canViewFinance && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Pembayaran</h2>
              {job.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada data pembayaran untuk job ini.</p>
              ) : (
                job.payments.map((p) => (
                  <dl key={p.id} className="space-y-1.5 text-sm">
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

          {/* Timeline placeholder */}
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Timeline</h2>
            <p className="text-sm text-muted-foreground">
              Activity Timeline otomatis (Blueprint §21) akan tampil di sini setelah Audit Log UI dibangun (Phase 5).
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

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
