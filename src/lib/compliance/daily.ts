import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { formatDate, getJakartaToday } from "@/lib/format";
import { gatherMonth, monthLabel, previousYm, REPORT_DUE_DAY, REPORT_KINDS, REPORT_LABEL, reportSentInfo } from "@/lib/compliance/monthly";
import { createDatabaseBackup, lastBackupAt } from "@/lib/compliance/backup";
import { stalledStages } from "@/lib/ppatStages";
import { cleanupIncomingUploads } from "@/lib/upload/directUpload";

/**
 * Pengecekan harian (dipanggil cron Vercel ~06.00 WIB):
 *  1. tugas bertenggat (termasuk kewajiban hukum setelah akta) yang jatuh
 *     tempo <= 3 hari atau terlambat -> pengingat ke penanggung jawab & Notaris;
 *  2. laporan bulanan MPD / Daftar Pusat Wasiat bulan lalu yang belum
 *     ditandai terkirim -> pengingat ke Notaris menjelang tenggat;
 *  3. backup database otomatis bila backup terakhir sudah >= 7 hari.
 * Aman dipanggil berulang: pengingat yang sama tidak dikirim dua kali sehari.
 */

async function notaries(): Promise<string[]> {
  const rows = await prisma.user.findMany({ where: { isActive: true, role: { name: "NOTARY" } }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** Kirim notifikasi kecuali pesan yang sama sudah dikirim ke user itu hari ini. */
async function notifyOnce(userId: string, message: string, type: "deadline" | "overdue" | "info", jobId?: string) {
  const today = getJakartaToday();
  const since = new Date(today.getTime() - 7 * 3600 * 1000); // 00.00 WIB dalam UTC
  const dup = await prisma.notification.findFirst({ where: { userId, message, createdAt: { gte: since } }, select: { id: true } });
  if (dup) return false;
  await createNotification({ userId, type, message, relatedEntityType: jobId ? "Job" : undefined, relatedEntityId: jobId });
  return true;
}

export async function runDailyChecks() {
  const today = getJakartaToday();
  const soon = new Date(today.getTime() + 3 * 86400000);
  const notaryIds = await notaries();
  let reminders = 0;

  // 1. Tugas bertenggat
  const tasks = await prisma.jobTask.findMany({
    where: {
      status: { not: "DONE" },
      dueDate: { not: null, lte: soon },
      job: { recordStatus: "ACTIVE", status: { not: "CANCELLED" } },
      // Pekerjaan yang sudah selesai: hanya kewajiban hukum setelah akta yang tetap diingatkan.
      OR: [{ job: { status: { not: "COMPLETED" } } }, { description: { startsWith: "Kewajiban setelah akta" } }]
    },
    select: { title: true, dueDate: true, assignedTo: true, job: { select: { id: true, jobNumber: true, picId: true } } }
  });
  for (const t of tasks) {
    const late = t.dueDate! < today;
    const msg = `${late ? "TERLAMBAT" : "Segera jatuh tempo"}: ${t.title} (${t.job.jobNumber}, tenggat ${formatDate(t.dueDate)}).`;
    const to = new Set<string>([...(t.assignedTo ? [t.assignedTo] : t.job.picId ? [t.job.picId] : []), ...notaryIds]);
    for (const u of Array.from(to)) if (await notifyOnce(u, msg, late ? "overdue" : "deadline", t.job.id)) reminders++;
  }

  // 2. Laporan bulanan bulan lalu
  const ym = previousYm(today);
  const day = today.getUTCDate();
  const data = await gatherMonth(ym);
  for (const kind of REPORT_KINDS) {
    const due = REPORT_DUE_DAY[kind];
    if (kind === "wasiat" && data.wasiat.length === 0) continue;
    // Pengingat mulai 5 hari sebelum tenggat, berlanjut setelah tenggat terlewat.
    if (day < Math.max(1, due - 5)) continue;
    if (await reportSentInfo(kind, ym)) continue;
    const msg = `${REPORT_LABEL[kind]} bulan ${monthLabel(ym)} belum ditandai terkirim (tenggat tanggal ${due}). Buka menu Laporan Bulanan.`;
    for (const u of notaryIds) if (await notifyOnce(u, msg, day > due ? "overdue" : "deadline")) reminders++;
  }

  // 2b. Langkah proses PPAT yang macet
  for (const s of await stalledStages()) {
    const msg = `Proses PPAT ${s.jobNumber} tertahan ${s.days} hari di tahap: ${s.label}.`;
    const to = new Set<string>([...(s.picId ? [s.picId] : []), ...notaryIds]);
    for (const u of Array.from(to)) if (await notifyOnce(u, msg, "deadline", s.jobId)) reminders++;
  }

  // 3. Backup mingguan
  const last = await lastBackupAt();
  let backup: string | null = null;
  if (!last || Date.now() - last.getTime() >= 7 * 86400000 - 3600000) {
    backup = (await createDatabaseBackup(null, "otomatis")).storageKey;
  }

  // 4. Unggahan langsung yang tidak pernah dikirim formnya -> dihapus.
  const cleanedUploads = await cleanupIncomingUploads().catch((err) => {
    console.error("[cron] pembersihan unggahan gagal", err);
    return 0;
  });

  return { reminders, backup, tasksChecked: tasks.length, cleanedUploads };
}
