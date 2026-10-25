import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Clock3, AlertTriangle, Download } from "lucide-react";
import { ChecklistUploadForm } from "@/components/portal/ChecklistUploadForm";
import { PORTAL_ACCEPT_ATTRIBUTE, PORTAL_EXTENSIONS_LABEL } from "@/lib/uploadValidation";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/portalSession";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatCurrency, formatDate, formatDateJakarta, formatDateTime } from "@/lib/format";
import { PORTAL_JOB_STATUS, portalStatusLabel } from "@/lib/portalLabels";
import { draftHash, reviewState } from "@/lib/deeds/review";
import { stagesFor } from "@/lib/ppatStages";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import { respondDraftReview } from "./actions";
import type { JobStatus } from "@prisma/client";
import { unwrapProps, type Async } from "@/lib/pageProps";

export const dynamic = "force-dynamic";

export default async function PortalJobDetailPage(props: Async<{ params: { id: string } }>) {
  const { params } = await unwrapProps(props);
  const { clientId } = await requireClientAccount();

  // Kunci isolasi antar-klien: id dari URL HARUS cocok DAN clientId HARUS
  // sama dengan klien yang login. Job milik klien lain -> hasilnya null ->
  // 404, persis seperti job yang memang tidak ada (tidak bocor "ada tapi
  // bukan milik Anda").
  const job = await prisma.job.findFirst({
    where: { id: params.id, clientId, recordStatus: "ACTIVE" },
    select: {
      id: true,
      jobNumber: true,
      description: true,
      status: true,
      deadline: true,
      startDate: true,
      completionDate: true,
      createdAt: true,
      serviceType: { select: { name: true, category: true } },
      ppatStages: { select: { step: true, doneAt: true } },
      ppatDeeds: { select: { deedType: true }, take: 1 },
      pic: { select: { name: true } },
      deedDrafts: {
        where: { deedId: null, ppatDeedId: null, reviews: { some: {} } },
        select: {
          id: true,
          title: true,
          data: true,
          reviews: { orderBy: { sharedAt: "desc" }, take: 1, select: { id: true, dataHash: true, decision: true, note: true, sharedAt: true, decidedAt: true } }
        }
      },
      payments: {
        where: { recordStatus: "ACTIVE" },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          paidAmount: true,
          remainingAmount: true,
          receipts: { where: { voidedAt: null }, orderBy: { paidAt: "asc" }, select: { id: true, receiptNumber: true, amount: true, paidAt: true } }
        }
      },
      checklists: {
        select: {
          items: {
            select: {
              id: true,
              label: true,
              isRequired: true,
              status: true,
              reviewStatus: true,
              reviewNote: true,
              reviewedAt: true,
              attachedDocument: { select: { id: true, fileName: true, uploadedAt: true, uploadedByClientAccountId: true } }
            },
            orderBy: { label: "asc" }
          }
        }
      }
    }
  });

  if (!job) notFound();

  // Riwayat: hanya perubahan status, dan hanya field `status` dari payload.
  // AuditLog juga menyimpan previousValue/newValue untuk aksi internal lain
  // (penugasan PIC, catatan, dll) -- itu TIDAK ditampilkan ke klien.
  const statusLogs = await prisma.auditLog.findMany({
    where: { entityType: "Job", entityId: job.id, action: { in: ["job_status_changed", "job_status_auto"] } },
    orderBy: { timestamp: "asc" },
    select: { id: true, timestamp: true, newValue: true }
  });

  const timeline: { id: string; at: Date; title: string }[] = [
    { id: "created", at: job.createdAt, title: "Permohonan diterima" },
    ...statusLogs.flatMap((log) => {
      const next = (log.newValue as { status?: string } | null)?.status as JobStatus | undefined;
      return next && next in PORTAL_JOB_STATUS
        ? [{ id: log.id, at: log.timestamp, title: `Status: ${portalStatusLabel(next)}` }]
        : [];
    })
  ];
  if (job.completionDate && job.status === "COMPLETED") {
    timeline.push({ id: "completed", at: job.completionDate, title: "Pekerjaan selesai" });
  }

  const checklistItems = job.checklists.flatMap((c) => c.items);
  const jobClosed = job.status === "COMPLETED" || job.status === "CANCELLED";
  const missingRequired = checklistItems.filter((i) => i.isRequired && i.status !== "COMPLETE");
  const statusInfo = PORTAL_JOB_STATUS[job.status];
  // Kemajuan proses PPAT (cek sertipikat -> pajak -> tanda tangan -> BPN -> sertipikat).
  const ppatDefs = stagesFor(job.ppatDeeds[0]?.deedType ?? SERVICE_CATALOG.find((c) => c.name === job.serviceType?.name)?.ppatType);
  const ppatDone = new Map(job.ppatStages.map((st) => [st.step, st.doneAt]));

  return (
    <div className="space-y-6">
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar pekerjaan
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{job.jobNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {job.serviceType?.name ?? "Layanan notaris"}
            {job.description ? ` · ${job.description}` : ""}
          </p>
        </div>
        <StatusBadge tone={classifyDeadline(job.deadline, job.status)} label={portalStatusLabel(job.status)} />
      </div>

      <Card className={statusInfo.needsClient ? "border-status-due-today/50" : undefined}>
        <p className="text-sm font-semibold text-foreground">{statusInfo.label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{statusInfo.hint}</p>
      </Card>

      {/* Yang perlu dilakukan klien tampil paling atas (penting di HP). */}
      {job.deedDrafts.map((d) => {
        const r = d.reviews[0];
        const state = reviewState(r, draftHash(d.data));
        return (
          <Card key={d.id}>
            <h2 className="mb-1 text-base font-bold text-foreground">Draft {d.title ?? "akta"} untuk Anda periksa</h2>
            {state === "outdated" ? (
              <p className="text-sm text-muted-foreground">Kantor sedang memperbarui draft ini. Anda akan diberi tahu bila versi baru siap.</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-muted-foreground">
                  Periksa nama, NIK, alamat, objek, dan angka. Draft belum berlaku sampai ditandatangani di hadapan Notaris.
                </p>
                <a
                  href={`/api/portal/deeds/${r.id}`}
                  className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <Download className="h-4 w-4" /> Unduh draft (Word)
                </a>
                {state === "approved" && <p className="text-sm text-status-on-track">Anda sudah menyetujui draft ini ({formatDateTime(r.decidedAt)}).</p>}
                {state === "changes" && (
                  <p className="text-sm text-foreground">
                    Koreksi Anda sudah dikirim: <span className="text-muted-foreground">{r.note}</span>. Kantor akan membagikan versi perbaikan.
                  </p>
                )}
                {state === "waiting" && (
                  <div className="space-y-2">
                    <form action={respondDraftReview.bind(null, r.id, "APPROVED")}>
                      <button type="submit" className="w-full rounded-md bg-status-on-track py-2.5 text-sm font-medium text-background hover:opacity-90">
                        Saya sudah membaca dan setuju
                      </button>
                    </form>
                    <form action={respondDraftReview.bind(null, r.id, "CHANGES")} className="space-y-2">
                      <textarea
                        name="note"
                        required
                        minLength={3}
                        rows={3}
                        placeholder="Tulis yang perlu dikoreksi (mis. ejaan nama, alamat, luas tanah)"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                      <button type="submit" className="w-full rounded-md border border-border py-2.5 text-sm font-medium hover:bg-muted">
                        Kirim koreksi
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </Card>
        );
      })}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-foreground">Dokumen yang Diperlukan</h2>
          {checklistItems.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {checklistItems.filter((i) => i.status === "COMPLETE").length}/{checklistItems.length} lengkap
            </span>
          )}
        </div>
        {checklistItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada daftar dokumen untuk pekerjaan ini.</p>
        ) : (
          <ul className="divide-y divide-border">
            {checklistItems.map((item) => {
              const accepted = item.status === "COMPLETE";
              const review = accepted ? "ACCEPTED" : item.reviewStatus; // COMPLETE oleh kantor = diterima
              const canUpload = !accepted && !jobClosed;
              const doc = item.attachedDocument;
              return (
                <li key={item.id} className="py-3 text-sm">
                  <div className="flex items-start gap-3">
                    <ReviewIcon review={review} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={accepted ? "text-muted-foreground line-through" : "font-medium text-foreground"}>
                          {item.label}
                        </span>
                        {!item.isRequired && <span className="text-xs text-muted-foreground">(opsional)</span>}
                        <ReviewBadge review={review} />
                      </div>

                      {review === "NEEDS_REVISION" && item.reviewNote && (
                        <p className="mt-1 rounded-md border border-status-overdue/30 bg-status-overdue/5 px-2 py-1 text-xs text-foreground">
                          Catatan kantor: {item.reviewNote}
                        </p>
                      )}

                      {doc && (doc.uploadedByClientAccountId || accepted) && (
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            File: <span className="break-all text-foreground">{doc.fileName}</span> · {formatDateTime(doc.uploadedAt)}
                          </span>
                          {doc.uploadedByClientAccountId && (
                            <a
                              href={`/api/portal/documents/${doc.id}/download`}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download className="h-3 w-3" /> Lihat
                            </a>
                          )}
                        </p>
                      )}

                      {canUpload && (
                        <ChecklistUploadForm
                          checklistItemId={item.id}
                          accept={PORTAL_ACCEPT_ATTRIBUTE}
                          allowedLabel={PORTAL_EXTENSIONS_LABEL}
                          replace={review === "PENDING_REVIEW" || review === "NEEDS_REVISION"}
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {jobClosed && (
          <p className="mt-3 text-xs text-muted-foreground">Pekerjaan sudah ditutup; unggah dokumen tidak tersedia.</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-bold text-foreground">Informasi</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Target selesai" value={job.deadline ? formatDate(job.deadline) : "Belum ditentukan"} />
            <Row label="Mulai dikerjakan" value={job.startDate ? formatDate(job.startDate) : "—"} />
            <Row label="Selesai" value={job.completionDate ? formatDate(job.completionDate) : "—"} />
            <Row label="Penanggung jawab" value={job.pic?.name ?? "—"} />
          </dl>
        </Card>

        {ppatDefs.length > 0 && (
          <Card>
            <h2 className="mb-3 text-base font-bold text-foreground">Tahapan Proses</h2>
            <ol className="space-y-2 text-sm">
              {ppatDefs.map((d, i) => {
                const at = ppatDone.get(d.key);
                return (
                  <li key={d.key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className={
                        at
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-status-on-track text-[11px] text-background"
                          : "flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground"
                      }
                    >
                      {at ? "✓" : i + 1}
                    </span>
                    <span className={at ? "text-foreground" : "text-muted-foreground"}>{d.clientLabel}</span>
                    {at && <span className="text-xs text-muted-foreground">{formatDateJakarta(at)}</span>}
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        {job.payments.map((p) => (
          <Card key={p.id}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-foreground">Tagihan {p.invoiceNumber ?? ""}</h2>
              <a href={`/api/portal/billing/tagihan/${p.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Download className="h-3.5 w-3.5" /> Unduh tagihan
              </a>
            </div>
            <dl className="space-y-1 text-sm">
              <Row label="Total biaya" value={formatCurrency(p.totalAmount)} />
              <Row label="Sudah dibayar" value={formatCurrency(p.paidAmount)} />
              <Row label="Sisa" value={Number(p.remainingAmount) > 0 ? formatCurrency(p.remainingAmount) : "Lunas"} />
            </dl>
            {p.receipts.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-border pt-2 text-xs">
                {p.receipts.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <span className="text-muted-foreground">
                      {formatDate(r.paidAt)} · {formatCurrency(r.amount)}
                    </span>
                    <a href={`/api/portal/billing/kuitansi/${r.id}`} className="font-medium text-primary hover:underline">
                      Kuitansi {r.receiptNumber}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}

        <Card>
          <h2 className="mb-3 text-base font-bold text-foreground">Riwayat</h2>
          <ol className="space-y-3 text-sm">
            {timeline.map((t) => (
              <li key={t.id} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(t.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

type ReviewView = "PENDING_REVIEW" | "ACCEPTED" | "NEEDS_REVISION" | null | undefined;

function ReviewIcon({ review }: { review: ReviewView }) {
  if (review === "ACCEPTED") return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-on-track" />;
  if (review === "PENDING_REVIEW") return <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-status-due-soon" />;
  if (review === "NEEDS_REVISION") return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-overdue" />;
  return <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />;
}

function ReviewBadge({ review }: { review: ReviewView }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACCEPTED: { label: "Diterima", cls: "bg-status-on-track/10 text-status-on-track" },
    PENDING_REVIEW: { label: "Menunggu pemeriksaan", cls: "bg-status-due-soon/10 text-status-due-soon" },
    NEEDS_REVISION: { label: "Perlu diperbaiki", cls: "bg-status-overdue/10 text-status-overdue" }
  };
  const v = review ? map[review] : { label: "Belum diunggah", cls: "bg-muted text-muted-foreground" };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${v.cls}`}>{v.label}</span>;
}
