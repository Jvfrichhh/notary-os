import type { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { createClientNotification } from "@/lib/clientNotifications";
import { portalStatusLabel } from "@/lib/portalLabels";
import { VALID_TRANSITIONS } from "@/lib/jobStatus";

/**
 * Otomatisasi alur job supaya status tidak bergantung pada ingatan orang:
 *  - job dengan PIC langsung "Sedang Diproses" (diatur di jobCreation);
 *  - checklist wajib lengkap -> kembali "Sedang Diproses" + PIC diberi tahu;
 *  - dokumen diminta perbaikan -> "Menunggu Dokumen";
 *  - draft diajukan -> "Review" + Notaris diberi tahu; disetujui -> "Siap
 *    Ditandatangani"; akta disahkan -> "Selesai".
 * Semua perubahan otomatis tercatat di audit log (action job_status_auto)
 * dan klien menerima notifikasi status di portal.
 */

/** Jalur antar status mengikuti VALID_TRANSITIONS (BFS); null bila tak terjangkau. */
function pathTo(from: JobStatus, to: JobStatus): JobStatus[] | null {
  if (from === to) return [];
  const queue: { s: JobStatus; path: JobStatus[] }[] = [{ s: from, path: [] }];
  const seen = new Set<JobStatus>([from]);
  while (queue.length) {
    const { s, path } = queue.shift()!;
    for (const n of VALID_TRANSITIONS[s] ?? []) {
      if (seen.has(n)) continue;
      const p = [...path, n];
      if (n === to) return p;
      seen.add(n);
      queue.push({ s: n, path: p });
    }
  }
  return null;
}

/**
 * Pindahkan job ke status `target` bila terjangkau dari status sekarang
 * (melewati status antara, mis. INBOX -> IN_PROGRESS -> REVIEW).
 * `force` dipakai hanya saat akta disahkan (selesai dari status apa pun yang belum final).
 * Mengembalikan true bila status berubah.
 */
export async function autoSetJobStatus(
  jobId: string,
  target: JobStatus,
  reason: string,
  actorUserId: string | null,
  opts: { force?: boolean; onlyFrom?: JobStatus[] } = {}
): Promise<boolean> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, status: true, jobNumber: true, clientId: true, completionDate: true } });
  if (!job || job.status === target) return false;
  if (job.status === "COMPLETED" || job.status === "CANCELLED") return false;
  if (opts.onlyFrom && !opts.onlyFrom.includes(job.status)) return false;
  if (!opts.force && pathTo(job.status, target) === null) return false;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: target, completionDate: target === "COMPLETED" ? new Date() : job.completionDate }
  });
  await writeAuditLog({
    userId: actorUserId,
    action: "job_status_auto",
    entityType: "Job",
    entityId: jobId,
    previousValue: { status: job.status },
    newValue: { status: target, reason }
  });
  await createClientNotification({
    clientId: job.clientId,
    type: "status_changed",
    message: `Status pekerjaan ${job.jobNumber} kini: ${portalStatusLabel(target)}.`,
    relatedEntityType: "Job",
    relatedEntityId: job.id
  });
  return true;
}

/**
 * Dipanggil setiap item checklist berubah.
 *  - semua dokumen wajib lengkap -> job yang menunggu dokumen lanjut ke
 *    "Sedang Diproses" dan PIC diberi tahu;
 *  - `revision` (dokumen diminta perbaikan) -> job berjalan menjadi
 *    "Menunggu Dokumen".
 */
export async function onChecklistChanged(jobId: string, actorUserId: string | null, opts: { revision?: boolean } = {}) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true, jobNumber: true } });
  if (!job) return;
  if (opts.revision) {
    await autoSetJobStatus(jobId, "WAITING_FOR_DOCUMENT", "dokumen klien diminta perbaikan", actorUserId, { onlyFrom: ["IN_PROGRESS"] });
    return;
  }
  const [required, missing] = await Promise.all([
    prisma.checklistItem.count({ where: { checklist: { jobId }, isRequired: true } }),
    prisma.checklistItem.count({ where: { checklist: { jobId }, isRequired: true, status: "MISSING" } })
  ]);
  if (required === 0 || missing > 0) return;
  const moved = await autoSetJobStatus(jobId, "IN_PROGRESS", "checklist dokumen wajib lengkap", actorUserId, {
    onlyFrom: ["WAITING_FOR_DOCUMENT", "WAITING_FOR_CLIENT", "INBOX"]
  });
  if (moved || job.status === "IN_PROGRESS") {
    await notifyJobPeople(jobId, `Semua dokumen wajib untuk ${job.jobNumber} sudah lengkap.`, { pic: true });
  }
}

/** Notaris yang menangani job; bila belum ditentukan, semua Notaris aktif. */
async function notaryIds(jobId: string): Promise<string[]> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { notaryId: true } });
  if (job?.notaryId) return [job.notaryId];
  const users = await prisma.user.findMany({ where: { isActive: true, role: { name: "NOTARY" } }, select: { id: true } });
  return users.map((u) => u.id);
}

/** Kirim notifikasi ke PIC dan/atau Notaris job (PIC kosong -> jatuh ke Notaris). */
export async function notifyJobPeople(jobId: string, message: string, to: { pic?: boolean; notary?: boolean }) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { picId: true } });
  const ids = new Set<string>();
  if (to.pic && job?.picId) ids.add(job.picId);
  if (to.notary || (to.pic && !job?.picId)) for (const id of await notaryIds(jobId)) ids.add(id);
  for (const userId of Array.from(ids)) {
    await createNotification({ userId, type: "info", message, relatedEntityType: "Job", relatedEntityId: jobId });
  }
}
