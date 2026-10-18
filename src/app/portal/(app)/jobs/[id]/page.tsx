import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/portalSession";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatDate, formatDateTime } from "@/lib/format";
import { PORTAL_JOB_STATUS, portalStatusLabel } from "@/lib/portalLabels";
import type { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PortalJobDetailPage({ params }: { params: { id: string } }) {
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
      pic: { select: { name: true } },
      checklists: {
        select: {
          items: {
            select: { id: true, label: true, isRequired: true, status: true },
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
    where: { entityType: "Job", entityId: job.id, action: "job_status_changed" },
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
  const missingRequired = checklistItems.filter((i) => i.isRequired && i.status !== "COMPLETE");
  const statusInfo = PORTAL_JOB_STATUS[job.status];

  return (
    <div className="space-y-6">
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar pekerjaan
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{job.jobNumber}</h1>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Informasi</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Target selesai" value={job.deadline ? formatDate(job.deadline) : "Belum ditentukan"} />
            <Row label="Mulai dikerjakan" value={job.startDate ? formatDate(job.startDate) : "—"} />
            <Row label="Selesai" value={job.completionDate ? formatDate(job.completionDate) : "—"} />
            <Row label="Penanggung jawab" value={job.pic?.name ?? "—"} />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Riwayat</h2>
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

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Dokumen yang Diperlukan</h2>
          {checklistItems.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {checklistItems.length - missingRequired.length}/{checklistItems.length} lengkap
            </span>
          )}
        </div>
        {checklistItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada daftar dokumen untuk pekerjaan ini.</p>
        ) : (
          <ul className="divide-y divide-border">
            {checklistItems.map((item) => {
              const done = item.status === "COMPLETE";
              return (
                <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-status-on-track" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={done ? "text-muted-foreground line-through" : "text-foreground"}>{item.label}</span>
                  {!item.isRequired && <span className="text-xs text-muted-foreground">(opsional)</span>}
                  {!done && item.isRequired && (
                    <span className="ml-auto text-xs font-medium text-status-due-today">Belum diterima</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {missingRequired.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Unggah dokumen melalui portal akan tersedia pada tahap berikutnya. Untuk saat ini, serahkan dokumen
            langsung ke kantor notaris.
          </p>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
