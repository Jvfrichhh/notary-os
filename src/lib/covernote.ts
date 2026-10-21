import { prisma } from "@/lib/prisma";
import { getFileStorage } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { NOTARIS, PPAT } from "@/lib/deeds/common";
import { buildSimpleDocx, type DocBlock } from "@/lib/office/simpleDocx";
import { getJakartaToday } from "@/lib/format";

/**
 * Covernote (surat keterangan Notaris/PPAT) untuk bank: menerangkan akta yang
 * sudah ditandatangani, proses yang sedang berjalan, dan perkiraan selesai.
 * Nomor "<urut>/CN/<bulan>/<tahun>" berurut per tahun (dihitung dari audit
 * log covernote_issued, dipesan dengan kunci supaya tidak dobel). File Word tersimpan di Document Vault pekerjaan.
 */

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const tgl = (d: Date) => `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface CovernoteInput {
  bank: string;
  bankAddress: string | null;
  debtor: string;
  items: string[];
  estimate: Date | null;
  estimateText: string | null;
  note: string | null;
}

/** Uraian awal dari akta PPAT & akta notaris pada pekerjaan (bisa diedit sebelum dibuat). */
export async function suggestCovernoteItems(jobId: string): Promise<string[]> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      ppatDeeds: { where: { recordStatus: "ACTIVE" }, orderBy: { deedDate: "asc" }, select: { deedNumber: true, deedDate: true, deedType: true, partyFrom: true, partyTo: true, rightType: true, location: true, submittedToBpnAt: true } },
      deeds: { where: { recordStatus: "ACTIVE" }, orderBy: { deedDate: "asc" }, select: { deedNumber: true, deedDate: true, deedType: true } }
    }
  });
  if (!job) return [];
  const items: string[] = [];
  for (const d of job.ppatDeeds) {
    items.push(
      `Telah ditandatangani di hadapan kami Akta ${d.deedType} Nomor ${d.deedNumber} tanggal ${tgl(d.deedDate)} antara ${d.partyFrom} dan ${d.partyTo}, atas ${d.rightType ?? "bidang tanah"}${d.location ? ` terletak di ${d.location}` : ""}.`
    );
    items.push(
      d.submittedToBpnAt
        ? `Akta tersebut telah kami sampaikan ke Kantor Pertanahan pada tanggal ${tgl(d.submittedToBpnAt)} dan saat ini sedang dalam proses pendaftaran.`
        : "Akta tersebut sedang kami siapkan untuk disampaikan ke Kantor Pertanahan guna pendaftarannya."
    );
  }
  for (const d of job.deeds) items.push(`Telah ditandatangani di hadapan kami Akta ${d.deedType} Nomor ${d.deedNumber} tanggal ${tgl(d.deedDate)}.`);
  return items;
}

/**
 * Pesan nomor berikutnya secara aman dari tabrakan: dalam satu transaksi dengan
 * kunci advisory, hitung covernote tahun ini lalu langsung catat "covernote_issued"
 * (nomor dianggap terpakai walaupun langkah berikutnya gagal).
 */
async function reserveNumber(today: Date, jobId: string, userId: string, bank: string): Promise<string> {
  const y = today.getUTCFullYear();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('covernote_number'))`;
    const issued = await tx.auditLog.count({
      where: { action: "covernote_issued", timestamp: { gte: new Date(Date.UTC(y, 0, 1) - 7 * 3600000) } }
    });
    const number = `${issued + 1}/CN/${ROMAWI[today.getUTCMonth()]}/${y}`;
    await tx.auditLog.create({ data: { userId, action: "covernote_issued", entityType: "Job", entityId: jobId, newValue: { number, bank } } });
    return number;
  });
}

export function buildCovernoteDocx(number: string, today: Date, input: CovernoteInput): Buffer {
  const kota = NOTARIS.kota.replace(/^Kota |^Kabupaten /, "");
  const est = input.estimateText || (input.estimate ? `paling lambat tanggal ${tgl(input.estimate)}` : "setelah proses di instansi terkait selesai");
  const blocks: DocBlock[] = [
    { t: "p", text: `**NOTARIS & PPAT ${NOTARIS.namaSingkat}**`, align: "center", spaceAfter: 0, size: 13 },
    { t: "p", text: `${NOTARIS.kedudukan} · PPAT daerah kerja ${PPAT.daerahKerja}`, align: "center", spaceAfter: 240 },
    { t: "p", text: `${kota}, ${tgl(today)}`, align: "right" },
    { t: "p", text: `Nomor  : ${number}`, spaceAfter: 0 },
    { t: "p", text: "Perihal : Surat Keterangan (Covernote)", spaceAfter: 240 },
    { t: "p", text: "Kepada Yth.", spaceAfter: 0 },
    { t: "p", text: `**${input.bank}**`, spaceAfter: 0 },
    ...(input.bankAddress ? [{ t: "p" as const, text: input.bankAddress, spaceAfter: 0 }] : []),
    { t: "p", text: "di Tempat", spaceAfter: 240 },
    { t: "p", text: "Dengan hormat,", spaceAfter: 120 },
    {
      t: "p",
      align: "both",
      text: `Yang bertanda tangan di bawah ini, ${NOTARIS.namaLengkap}, ${NOTARIS.kedudukan} dan Pejabat Pembuat Akta Tanah dengan daerah kerja ${PPAT.daerahKerja}, dengan ini menerangkan sehubungan dengan fasilitas kredit atas nama **${input.debtor}**, bahwa:`
    },
    ...input.items.map((t, i) => ({ t: "p" as const, align: "both" as const, text: `${i + 1}. ${t}`, spaceAfter: 60 })),
    {
      t: "p",
      align: "both",
      text: `${input.items.length + 1}. Sertipikat beserta dokumen asli terkait akan kami serahkan kepada ${input.bank} ${est}, dengan ketentuan tidak terdapat hambatan pada instansi terkait.`
    },
    ...(input.note ? [{ t: "p" as const, align: "both" as const, text: input.note }] : []),
    { t: "p", text: "Demikian surat keterangan ini kami buat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.", align: "both", spaceAfter: 360 },
    { t: "p", text: "Hormat kami,", align: "right", spaceAfter: 1200 },
    { t: "p", text: NOTARIS.namaSingkat, bold: true, align: "right", spaceAfter: 0 },
    { t: "p", text: "Notaris & PPAT", align: "right" }
  ];
  return buildSimpleDocx(blocks, { title: `Covernote ${number}` });
}

/** Buat covernote, simpan di Document Vault pekerjaan, catat di audit log. */
export async function issueCovernote(jobId: string, input: CovernoteInput, userId: string) {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId }, select: { id: true, clientId: true, jobNumber: true } });
  const today = getJakartaToday();
  const number = await reserveNumber(today, job.id, userId, input.bank);
  const buffer = buildCovernoteDocx(number, today, input);
  const fileName = `Covernote_${number.replace(/\//g, "-")}_${job.jobNumber}.docx`;
  const upload = await getFileStorage().upload({ buffer, fileName, contentType: DOCX_MIME, folder: `documents/job-${job.id}` });
  const doc = await prisma.$transaction(async (tx) => {
    const d = await tx.document.create({
      data: {
        jobId: job.id,
        clientId: job.clientId,
        fileName,
        fileType: DOCX_MIME,
        fileSize: upload.size,
        category: "FINAL_DOCUMENT",
        description: `Covernote ${number} untuk ${input.bank} [covernote:${number}]`,
        storageKey: upload.storageKey,
        uploadedBy: userId
      }
    });
    await tx.documentVersion.create({
      data: { documentId: d.id, versionNumber: 1, isCurrent: true, storageKey: upload.storageKey, fileName, fileType: DOCX_MIME, fileSize: upload.size, uploadedBy: userId, notes: "Covernote dibuat" }
    });
    return d;
  });
  await writeAuditLog({ userId, action: "covernote_saved", entityType: "Job", entityId: job.id, newValue: { number, bank: input.bank, documentId: doc.id } });
  return { number, documentId: doc.id };
}
