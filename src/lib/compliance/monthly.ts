import { prisma } from "@/lib/prisma";
import { NOTARIS } from "@/lib/deeds/common";
import { buildSimpleDocx, type DocBlock } from "@/lib/office/simpleDocx";
import { formatDate, getJakartaToday } from "@/lib/format";

/**
 * Laporan bulanan wajib Notaris:
 *  - "mpd"    : salinan daftar akta (repertorium), daftar legalisasi, daftar
 *               waarmerking, dan daftar akta wasiat bulan lalu ke Majelis
 *               Pengawas Daerah -- paling lambat tanggal 15 bulan berikutnya
 *               (laporan NIHIL tetap dikirim bila tidak ada akta);
 *  - "wasiat" : daftar akta wasiat ke Daftar Pusat Wasiat (Ditjen AHU) --
 *               paling lambat tanggal 5 bulan berikutnya.
 * Status "sudah dikirim" dicatat di audit log (action monthly_report_sent,
 * entityType MonthlyReport, entityId "<kind>:<YYYY-MM>") -- tanpa tabel baru.
 */

export type ReportKind = "mpd" | "wasiat";
export const REPORT_DUE_DAY: Record<ReportKind, number> = { mpd: 15, wasiat: 5 };
export const REPORT_LABEL: Record<ReportKind, string> = {
  mpd: "Laporan bulanan ke Majelis Pengawas Daerah",
  wasiat: "Laporan akta wasiat ke Daftar Pusat Wasiat"
};

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${BULAN[m - 1]} ${y}`;
}

export function isYm(v: string | undefined | null): v is string {
  return !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

/** Bulan (YYYY-MM) sebelum bulan berjalan menurut waktu Jakarta. */
export function previousYm(today = getJakartaToday()): string {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Rentang [awal, akhir) bulan, sebagai tanggal UTC-midnight (konvensi kolom tanggal-saja). */
export function monthRange(ym: string): { start: Date; end: Date } {
  const [y, m] = ym.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

/** Tenggat laporan untuk bulan `ym` (tanggal 5 / 15 bulan berikutnya). */
export function reportDueDate(kind: ReportKind, ym: string): Date {
  const { end } = monthRange(ym);
  return new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), REPORT_DUE_DAY[kind]));
}

export async function gatherMonth(ym: string) {
  const { start, end } = monthRange(ym);
  const range = { gte: start, lt: end };
  const [akta, legalisasi, waarmerking, wasiat] = await Promise.all([
    prisma.repertorium.findMany({
      where: { deedDate: range, recordStatus: "ACTIVE" },
      orderBy: [{ year: "asc" }, { sequenceNumber: "asc" }],
      select: { sequenceNumber: true, deedDate: true, deedType: true, appearerName: true, deed: { select: { deedNumber: true } } }
    }),
    prisma.legalisasi.findMany({
      where: { date: range, recordStatus: "ACTIVE" },
      orderBy: { date: "asc" },
      select: { number: true, date: true, serviceType: true, client: { select: { fullName: true } } }
    }),
    prisma.waarmerking.findMany({
      where: { date: range, recordStatus: "ACTIVE" },
      orderBy: { date: "asc" },
      select: { number: true, date: true, serviceType: true, client: { select: { fullName: true } } }
    }),
    prisma.wasiat.findMany({
      where: { date: range, recordStatus: "ACTIVE" },
      orderBy: { date: "asc" },
      select: { id: true, deedNumber: true, date: true, wasiatType: true, status: true, client: { select: { fullName: true } } }
    })
  ]);
  return { akta, legalisasi, waarmerking, wasiat };
}

export type MonthData = Awaited<ReturnType<typeof gatherMonth>>;

/** Status kirim laporan (dari audit log). */
export async function reportSentInfo(kind: ReportKind, ym: string) {
  const log = await prisma.auditLog.findFirst({
    where: { action: "monthly_report_sent", entityType: "MonthlyReport", entityId: `${kind}:${ym}` },
    orderBy: { timestamp: "desc" },
    select: { timestamp: true, user: { select: { name: true } }, newValue: true }
  });
  return log ? { at: log.timestamp, by: log.user?.name ?? null, note: (log.newValue as { note?: string } | null)?.note ?? null } : null;
}

const nihil = (rows: string[][], cols: number) => (rows.length ? rows : [["-", "NIHIL", ...Array(cols - 2).fill("")]]);

/** "21 Oktober 2026" untuk tanggal surat. */
function tanggalPanjang(d: Date): string {
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function signature(): DocBlock[] {
  return [
    { t: "p", text: `${NOTARIS.kota.replace(/^Kota |^Kabupaten /, "")}, ${tanggalPanjang(getJakartaToday())}`, align: "right", spaceAfter: 0 },
    { t: "p", text: "Notaris,", align: "right", spaceAfter: 1200 },
    { t: "p", text: NOTARIS.namaSingkat, bold: true, align: "right" }
  ];
}

export function buildMpdReport(ym: string, d: MonthData): Buffer {
  const bulan = monthLabel(ym);
  const kosong = d.akta.length + d.legalisasi.length + d.waarmerking.length + d.wasiat.length === 0;
  const blocks: DocBlock[] = [
    { t: "p", text: "Kepada Yth.", spaceAfter: 0 },
    { t: "p", text: `**Majelis Pengawas Daerah Notaris ${NOTARIS.kota}**`, spaceAfter: 0 },
    { t: "p", text: "di Tempat", spaceAfter: 240 },
    { t: "p", text: `Perihal: Laporan Bulanan Notaris Bulan ${bulan}${kosong ? " (NIHIL)" : ""}`, bold: true, spaceAfter: 240 },
    { t: "p", text: "Dengan hormat,", spaceAfter: 120 },
    {
      t: "p",
      align: "both",
      text: `Yang bertanda tangan di bawah ini, ${NOTARIS.namaLengkap}, ${NOTARIS.kedudukan}, dengan ini menyampaikan salinan daftar akta dan daftar lain yang dibuat pada bulan ${bulan}, yaitu:`
    },
    { t: "p", text: `1. Daftar Akta (Repertorium): ${d.akta.length ? `${d.akta.length} akta` : "NIHIL"};`, spaceAfter: 0 },
    { t: "p", text: `2. Daftar Surat di Bawah Tangan yang Disahkan (Legalisasi): ${d.legalisasi.length || "NIHIL"};`, spaceAfter: 0 },
    { t: "p", text: `3. Daftar Surat di Bawah Tangan yang Dibukukan (Waarmerking): ${d.waarmerking.length || "NIHIL"};`, spaceAfter: 0 },
    { t: "p", text: `4. Daftar Akta Wasiat: ${d.wasiat.length || "NIHIL"}.`, spaceAfter: 240 },
    { t: "p", text: "Demikian laporan ini kami sampaikan. Atas perhatiannya kami ucapkan terima kasih.", spaceAfter: 360 },
    ...signature(),
    { t: "pageBreak" },
    { t: "p", text: `LAMPIRAN I — DAFTAR AKTA (REPERTORIUM) BULAN ${bulan.toUpperCase()}`, bold: true, align: "center" },
    {
      t: "table",
      header: ["No. Urut", "No. Akta", "Tanggal", "Sifat Akta", "Nama Penghadap / Pihak"],
      widths: [1, 1.3, 1.4, 3, 4],
      rows: nihil(
        d.akta.map((r) => [String(r.sequenceNumber), r.deed.deedNumber, formatDate(r.deedDate), r.deedType, r.appearerName]),
        5
      )
    },
    { t: "p", text: `LAMPIRAN II — DAFTAR LEGALISASI BULAN ${bulan.toUpperCase()}`, bold: true, align: "center" },
    {
      t: "table",
      header: ["No.", "Nomor", "Tanggal", "Jenis Surat", "Nama Pihak"],
      widths: [0.6, 1.8, 1.4, 3, 3.5],
      rows: nihil(
        d.legalisasi.map((r, i) => [String(i + 1), r.number, formatDate(r.date), r.serviceType ?? "-", r.client.fullName]),
        5
      )
    },
    { t: "p", text: `LAMPIRAN III — DAFTAR WAARMERKING BULAN ${bulan.toUpperCase()}`, bold: true, align: "center" },
    {
      t: "table",
      header: ["No.", "Nomor", "Tanggal", "Jenis Surat", "Nama Pihak"],
      widths: [0.6, 1.8, 1.4, 3, 3.5],
      rows: nihil(
        d.waarmerking.map((r, i) => [String(i + 1), r.number, formatDate(r.date), r.serviceType ?? "-", r.client.fullName]),
        5
      )
    },
    { t: "p", text: `LAMPIRAN IV — DAFTAR AKTA WASIAT BULAN ${bulan.toUpperCase()}`, bold: true, align: "center" },
    {
      t: "table",
      header: ["No.", "No. Akta", "Tanggal", "Jenis Wasiat", "Nama Pewasiat"],
      widths: [0.6, 1.8, 1.4, 3, 3.5],
      rows: nihil(
        d.wasiat.map((r, i) => [String(i + 1), r.deedNumber ?? "-", formatDate(r.date), r.wasiatType ?? "-", r.client.fullName]),
        5
      )
    },
    { t: "p", text: "Salinan daftar ini sesuai dengan aslinya.", spaceAfter: 240 },
    ...signature()
  ];
  return buildSimpleDocx(blocks, { title: `Laporan Bulanan MPD ${bulan}` });
}

export function buildWasiatReport(ym: string, d: MonthData): Buffer {
  const bulan = monthLabel(ym);
  const blocks: DocBlock[] = [
    { t: "p", text: "Kepada Yth.", spaceAfter: 0 },
    { t: "p", text: "**Direktur Jenderal Administrasi Hukum Umum**", spaceAfter: 0 },
    { t: "p", text: "u.p. Daftar Pusat Wasiat", spaceAfter: 0 },
    { t: "p", text: "Kementerian Hukum Republik Indonesia", spaceAfter: 240 },
    { t: "p", text: `Perihal: Laporan Daftar Akta Wasiat Bulan ${bulan}${d.wasiat.length ? "" : " (NIHIL)"}`, bold: true, spaceAfter: 240 },
    {
      t: "p",
      align: "both",
      text: `Yang bertanda tangan di bawah ini, ${NOTARIS.namaLengkap}, ${NOTARIS.kedudukan}, melaporkan daftar akta yang berkenaan dengan wasiat yang dibuat pada bulan ${bulan} sebagai berikut:`
    },
    {
      t: "table",
      header: ["No.", "No. Akta", "Tanggal", "Jenis Wasiat", "Nama Pewasiat"],
      widths: [0.6, 1.8, 1.4, 3, 3.5],
      rows: nihil(
        d.wasiat.map((r, i) => [String(i + 1), r.deedNumber ?? "-", formatDate(r.date), r.wasiatType ?? "-", r.client.fullName]),
        5
      )
    },
    { t: "p", text: "Catatan: laporan disampaikan juga melalui layanan AHU Online sesuai ketentuan yang berlaku.", size: 9, spaceAfter: 360 },
    ...signature()
  ];
  return buildSimpleDocx(blocks, { title: `Laporan Wasiat ${bulan}` });
}
