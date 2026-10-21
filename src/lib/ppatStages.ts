import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { createClientNotification } from "@/lib/clientNotifications";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import { autoSetJobStatus, notifyJobPeople } from "@/lib/jobAutomation";

/**
 * Langkah proses PPAT per pekerjaan. Satu baris PpatStage per langkah yang
 * sudah selesai. Langkah yang "macet" (langkah sebelumnya selesai tetapi
 * langkah ini belum dalam X hari) diingatkan oleh pengecekan harian.
 * Tanda tangan & penyampaian ke BPN ditandai otomatis dari Buku Akta PPAT.
 */

export interface StageDef {
  key: string;
  label: string;
  /** Label yang dilihat klien di portal. */
  clientLabel: string;
  /** Hari setelah langkah sebelumnya selesai sebelum diingatkan. */
  remindAfterDays: number;
  /** Isian nomor/rujukan yang lazim (mis. nomor validasi). */
  refLabel?: string;
}

const CEK: StageDef = { key: "CEK_SERTIFIKAT", label: "Cek sertipikat ke Kantor Pertanahan", clientLabel: "Pengecekan sertipikat", remindAfterDays: 7, refLabel: "No. berkas / tanggal SKPT" };
const PPH: StageDef = { key: "VALIDASI_PPH", label: "Validasi SSP PPh penjual/pemberi", clientLabel: "Validasi pajak penjual (PPh)", remindAfterDays: 7, refLabel: "No. validasi / NTPN" };
const BPHTB: StageDef = { key: "VALIDASI_BPHTB", label: "Validasi SSPD BPHTB pembeli/penerima", clientLabel: "Validasi pajak pembeli (BPHTB)", remindAfterDays: 7, refLabel: "No. validasi BPHTB" };
const TTD: StageDef = { key: "TANDA_TANGAN", label: "Penandatanganan akta", clientLabel: "Penandatanganan akta", remindAfterDays: 14 };
const BPN: StageDef = { key: "KE_BPN", label: "Akta & warkah disampaikan ke Kantor Pertanahan", clientLabel: "Pendaftaran di Kantor Pertanahan", remindAfterDays: 7, refLabel: "No. berkas permohonan" };
const SELESAI: StageDef = { key: "SERTIFIKAT_SELESAI", label: "Sertipikat selesai (balik nama / terdaftar)", clientLabel: "Sertipikat selesai", remindAfterDays: 30 };
const HT_SELESAI: StageDef = { key: "SERTIFIKAT_HT_TERBIT", label: "Sertipikat Hak Tanggungan terbit", clientLabel: "Sertipikat Hak Tanggungan terbit", remindAfterDays: 14 };
const APHT_DIBUAT: StageDef = { key: "APHT_DIBUAT", label: "Ditindaklanjuti dengan APHT", clientLabel: "Akta Pemberian Hak Tanggungan", remindAfterDays: 30 };

/** Tahapan mulai dipakai sejak rilis ini; pekerjaan PPAT yang lebih lama tidak dipantau otomatis. */
const STAGES_SINCE = new Date("2026-10-21T00:00:00Z");

/** Langkah terakhir: bila selesai, pekerjaan PPAT selesai. */
export const FINAL_STAGES = ["SERTIFIKAT_SELESAI", "SERTIFIKAT_HT_TERBIT", "APHT_DIBUAT"];

/** Langkah sesuai jenis akta PPAT pekerjaan. */
export function stagesFor(ppatType: string | null | undefined): StageDef[] {
  if (!ppatType) return [];
  if (ppatType.startsWith("Surat Kuasa Membebankan")) return [CEK, TTD, APHT_DIBUAT];
  if (ppatType.startsWith("Pemberian Hak Tanggungan")) return [CEK, TTD, BPN, HT_SELESAI];
  return [CEK, PPH, BPHTB, TTD, BPN, SELESAI];
}

/** Langkah yang berlaku untuk satu pekerjaan (dari akta PPAT-nya atau katalog layanan). */
export async function jobStageDefs(jobId: string): Promise<StageDef[]> {
  const j = await prisma.job.findUnique({
    where: { id: jobId },
    select: { serviceType: { select: { name: true } }, ppatDeeds: { where: { recordStatus: "ACTIVE" }, select: { deedType: true }, take: 1 } }
  });
  if (!j) return [];
  return stagesFor(j.ppatDeeds[0]?.deedType ?? SERVICE_CATALOG.find((c) => c.name === j.serviceType?.name)?.ppatType);
}

/** Tandai satu langkah selesai (idempoten); klien diberi tahu. Langkah terakhir menyelesaikan pekerjaan. */
export async function completeStage(
  jobId: string,
  step: string,
  opts: { userId: string | null; date?: Date; reference?: string | null; note?: string | null; notifyClient?: boolean } = { userId: null }
) {
  const existing = await prisma.ppatStage.findUnique({ where: { jobId_step: { jobId, step } } });
  if (existing) return existing;
  const stage = await prisma.ppatStage.create({
    data: { jobId, step, doneAt: opts.date ?? new Date(), reference: opts.reference ?? null, note: opts.note ?? null, doneById: opts.userId }
  });
  await writeAuditLog({ userId: opts.userId, action: "ppat_stage_done", entityType: "Job", entityId: jobId, newValue: { step, reference: opts.reference } });
  if (FINAL_STAGES.includes(step)) {
    const done = await autoSetJobStatus(jobId, "COMPLETED", `tahap PPAT terakhir selesai (${step})`, opts.userId, { force: true });
    if (done) await notifyJobPeople(jobId, "Seluruh tahap proses PPAT selesai; pekerjaan ditandai selesai.", { pic: true });
  }
  if (opts.notifyClient !== false) {
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { clientId: true, jobNumber: true, serviceType: { select: { name: true } } } });
    const def = [CEK, PPH, BPHTB, TTD, BPN, SELESAI, HT_SELESAI, APHT_DIBUAT].find((s) => s.key === step);
    if (job && def) {
      await createClientNotification({
        clientId: job.clientId,
        type: "status_changed",
        message: `${job.jobNumber}: tahap "${def.clientLabel}" selesai.`,
        relatedEntityType: "Job",
        relatedEntityId: jobId
      });
    }
  }
  return stage;
}

export async function undoStage(jobId: string, step: string, userId: string) {
  await prisma.ppatStage.deleteMany({ where: { jobId, step } });
  await writeAuditLog({ userId, action: "ppat_stage_undone", entityType: "Job", entityId: jobId, newValue: { step } });
}

/** Langkah yang macet untuk pengingat harian: [{jobId, label, days}] */
export async function stalledStages(now = new Date()) {
  const jobs = await prisma.job.findMany({
    where: {
      recordStatus: "ACTIVE",
      status: { not: "CANCELLED" },
      serviceType: { category: "PPAT" },
      // Pekerjaan lama (sebelum fitur tahapan) tidak diingatkan kecuali tahapannya sudah mulai dicatat.
      OR: [{ createdAt: { gte: STAGES_SINCE } }, { ppatStages: { some: {} } }]
    },
    select: {
      id: true,
      jobNumber: true,
      startDate: true,
      createdAt: true,
      picId: true,
      serviceType: { select: { name: true } },
      ppatStages: { select: { step: true, doneAt: true } },
      ppatDeeds: { select: { deedType: true }, take: 1 }
    }
  });
  const out: { jobId: string; jobNumber: string; picId: string | null; label: string; days: number }[] = [];
  for (const j of jobs) {
    const type = j.ppatDeeds[0]?.deedType ?? SERVICE_CATALOG.find((c) => c.name === j.serviceType?.name)?.ppatType;
    const defs = stagesFor(type);
    const done = new Map(j.ppatStages.map((s) => [s.step, s.doneAt]));
    let prev: Date = j.startDate ?? j.createdAt;
    for (const d of defs) {
      const at = done.get(d.key);
      if (at) {
        prev = at;
        continue;
      }
      const days = Math.floor((now.getTime() - prev.getTime()) / 86400000);
      // Diingatkan pada hari batas, lalu setiap tujuh hari (bukan setiap hari).
      if (days >= d.remindAfterDays && (days - d.remindAfterDays) % 7 === 0) out.push({ jobId: j.id, jobNumber: j.jobNumber, picId: j.picId, label: d.label, days });
      break; // hanya langkah pertama yang belum selesai
    }
  }
  return out;
}
