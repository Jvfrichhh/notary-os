import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { formatDate } from "@/lib/format";

/**
 * Kewajiban setelah akta disahkan, dengan batas waktu dihitung dari tanggal
 * akta. Dibuat otomatis sebagai tugas (JobTask + dueDate) saat "Sahkan &
 * Daftarkan", lalu diingatkan oleh pengecekan harian (/api/cron/daily).
 * Batas waktu mengikuti ketentuan umum; Notaris dapat menyesuaikan
 * tanggalnya di halaman job.
 */
export const STATUTORY_DUTIES: Record<string, { title: string; days: number; basis: string }[]> = {
  fidusia: [{ title: "Daftarkan Jaminan Fidusia secara elektronik (AHU Online)", days: 30, basis: "PP 21/2015: 30 hari sejak akta" }],
  pendirian_pt: [
    { title: "Ajukan pengesahan badan hukum PT (AHU Online)", days: 60, basis: "UUPT Pasal 10: 60 hari sejak akta ditandatangani" }
  ],
  perubahan_pt: [
    {
      title: "Ajukan persetujuan / pemberitahuan perubahan anggaran dasar & data perseroan (AHU Online)",
      days: 30,
      basis: "UUPT Pasal 21 & 94/111: 30 hari sejak akta"
    }
  ],
  peralihan_saham: [
    { title: "Sampaikan pemberitahuan perubahan susunan pemegang saham (AHU Online)", days: 30, basis: "UUPT Pasal 56: 30 hari sejak pencatatan" }
  ]
};

/** Tanggal-saja (UTC-midnight) + n hari. */
function addDays(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}

/** Buat tugas kewajiban untuk akta yang baru disahkan; PIC (atau Notaris) diberi tahu. */
export async function createStatutoryTasks(params: {
  templateKey: string;
  jobId: string;
  deedNumber: string;
  deedDate: Date;
  assigneeId: string | null;
}): Promise<number> {
  const duties = STATUTORY_DUTIES[params.templateKey] ?? [];
  for (const d of duties) {
    const due = addDays(params.deedDate, d.days);
    const task = await prisma.jobTask.create({
      data: {
        jobId: params.jobId,
        title: `${d.title} — akta ${params.deedNumber}`,
        description: `Kewajiban setelah akta. Dasar: ${d.basis}.`,
        assignedTo: params.assigneeId,
        dueDate: due
      }
    });
    if (params.assigneeId) {
      await createNotification({
        userId: params.assigneeId,
        type: "deadline",
        message: `Tugas baru dengan tenggat hukum: ${task.title} (paling lambat ${formatDate(due)}).`,
        relatedEntityType: "Job",
        relatedEntityId: params.jobId
      });
    }
  }
  return duties.length;
}
