import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { writeAuditLog } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import { autoSetJobStatus, notifyJobPeople } from "@/lib/jobAutomation";

/**
 * Buku Daftar Akta PPAT. Nomor akta PPAT berurut per tahun ("12/2026"),
 * terpisah dari repertorium notaris. Setelah akta didaftarkan:
 *  - tugas bertenggat dibuat otomatis pada pekerjaan terkait:
 *      * akta peralihan/pembebanan -> sampaikan akta & warkah ke Kantor
 *        Pertanahan paling lambat 7 hari kerja (PP 24/1997 Pasal 40; UUHT Pasal 13);
 *      * SKMHT -> tindak lanjuti dengan APHT paling lambat 1 bulan (tanah
 *        terdaftar) / 3 bulan (belum terdaftar) (UUHT Pasal 15);
 *  - pekerjaan otomatis selesai.
 * Hari kerja dihitung Senin–Jumat (hari libur nasional belum diperhitungkan).
 */

export function addWorkingDays(d: Date, n: number): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  let left = n;
  while (left > 0) {
    out.setUTCDate(out.getUTCDate() + 1);
    const day = out.getUTCDay();
    if (day !== 0 && day !== 6) left--;
  }
  return out;
}

const addMonths = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));

export const isSkmht = (type: string) => type.startsWith("Surat Kuasa Membebankan");
export const isApht = (type: string) => type.startsWith("Pemberian Hak Tanggungan");

/** Tenggat & judul kewajiban setelah akta PPAT. */
export function ppatDuty(deedType: string, deedDate: Date): { title: string; due: Date; basis: string } {
  if (isSkmht(deedType)) {
    return {
      title: "Tindak lanjuti SKMHT dengan APHT",
      due: addMonths(deedDate, 1),
      basis: "UUHT Pasal 15: 1 bulan (tanah terdaftar) / 3 bulan (belum terdaftar)"
    };
  }
  if (isApht(deedType)) {
    return { title: "Daftarkan Hak Tanggungan (HT-el) ke Kantor Pertanahan", due: addWorkingDays(deedDate, 7), basis: "UUHT Pasal 13: 7 hari kerja" };
  }
  return { title: "Sampaikan akta & warkah ke Kantor Pertanahan", due: addWorkingDays(deedDate, 7), basis: "PP 24/1997 Pasal 40: 7 hari kerja" };
}

export interface PpatInput {
  deedDate: Date;
  deedType: string;
  jobId: string | null;
  clientId: string | null;
  partyFrom: string;
  partyTo: string;
  rightType: string | null;
  location: string | null;
  landArea: string | null;
  buildingArea: string | null;
  transactionValue: number | null;
  njopValue: number | null;
  nop: string | null;
  sspDate: Date | null;
  sspAmount: number | null;
  sspdDate: Date | null;
  sspdAmount: number | null;
  notes: string | null;
}

/** Nomor urut berikutnya pada tahun akta. */
export async function nextPpatSequence(year: number): Promise<number> {
  const agg = await prisma.ppatDeed.aggregate({ where: { year }, _max: { sequence: true } });
  return (agg._max.sequence ?? 0) + 1;
}

/** Daftarkan akta PPAT; nomor boleh diisi manual (bila sudah ada nomor fisik), default urut berikutnya. */
export async function registerPpatDeed(input: PpatInput, userId: string, sequence?: number) {
  const year = input.deedDate.getUTCFullYear();
  let deed: Awaited<ReturnType<typeof prisma.ppatDeed.create>> | null = null;
  for (let i = 0; i < 5 && !deed; i++) {
    const seq = sequence ?? (await nextPpatSequence(year)) + i;
    try {
      deed = await prisma.ppatDeed.create({ data: { ...input, year, sequence: seq, deedNumber: `${seq}/${year}`, createdById: userId } });
    } catch (err) {
      const dup = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!dup) throw err;
      if (sequence) throw new Error(`Nomor akta PPAT ${sequence}/${year} sudah terdaftar.`);
    }
  }
  if (!deed) throw new Error("Gagal membuat nomor akta PPAT. Coba lagi.");

  await writeAuditLog({
    userId,
    action: "ppat_deed_registered",
    entityType: "PpatDeed",
    entityId: deed.id,
    newValue: { deedNumber: deed.deedNumber, deedType: deed.deedType, jobId: deed.jobId }
  });

  if (deed.jobId) {
    const job = await prisma.job.findUnique({ where: { id: deed.jobId }, select: { picId: true, jobNumber: true } });
    const duty = ppatDuty(deed.deedType, deed.deedDate);
    const assignee = job?.picId ?? userId;
    await prisma.jobTask.create({
      data: {
        jobId: deed.jobId,
        title: `${duty.title} — akta PPAT ${deed.deedNumber}`,
        description: `Kewajiban setelah akta PPAT. Dasar: ${duty.basis}.`,
        assignedTo: assignee,
        dueDate: duty.due
      }
    });
    await createNotification({
      userId: assignee,
      type: "deadline",
      message: `${duty.title} untuk akta PPAT ${deed.deedNumber} paling lambat ${formatDate(duty.due)}.`,
      relatedEntityType: "Job",
      relatedEntityId: deed.jobId
    });
    const done = await autoSetJobStatus(deed.jobId, "COMPLETED", `akta PPAT ${deed.deedNumber} didaftarkan`, userId, { force: true });
    if (done && job) await notifyJobPeople(deed.jobId, `Akta PPAT ${deed.deedNumber} didaftarkan; pekerjaan ${job.jobNumber} selesai.`, { pic: true });
  }
  return deed;
}

/** Tandai akta sudah disampaikan ke Kantor Pertanahan; tugas terkait ikut selesai. */
export async function markSubmittedToBpn(id: string, date: Date, userId: string) {
  const deed = await prisma.ppatDeed.update({ where: { id }, data: { submittedToBpnAt: date } });
  if (deed.jobId) {
    await prisma.jobTask.updateMany({
      where: { jobId: deed.jobId, status: { not: "DONE" }, title: { endsWith: `akta PPAT ${deed.deedNumber}` } },
      data: { status: "DONE", completedAt: new Date() }
    });
  }
  await writeAuditLog({ userId, action: "ppat_submitted_bpn", entityType: "PpatDeed", entityId: id, newValue: { date } });
  return deed;
}
