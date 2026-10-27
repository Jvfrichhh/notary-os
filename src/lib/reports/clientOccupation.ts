import { prisma } from "@/lib/prisma";
import { NOTARIS } from "@/lib/deeds/common";
import { buildSimpleDocx, type DocBlock } from "@/lib/office/simpleDocx";
import { buildSimpleXlsx } from "@/lib/office/simpleXlsx";
import { signature } from "@/lib/compliance/monthly";
import { normalizeOccupation } from "@/lib/occupations";
import { formatDateJakarta, getJakartaToday } from "@/lib/format";

/**
 * Laporan tahunan PEKERJAAN/PROFESI KLIEN (untuk laporan PKJM): berapa klien
 * yang terdaftar di kantor per jenis pekerjaan (karyawan swasta, pelajar/
 * mahasiswa, tidak bekerja, dst.), berikut daftarnya. Data diambil dari kolom
 * "Pekerjaan (sesuai KTP)" di data klien; klien bertipe Perusahaan dihitung
 * sebagai "Badan Usaha (Perusahaan)". Unduhan dicatat di audit log.
 */

export const COMPANY_CATEGORY = "Badan Usaha (Perusahaan)";
export const EMPTY_CATEGORY = "Belum diisi";

/** "2026" = klien terdaftar tahun itu; "all" = seluruh klien aktif. */
export type Period = number | "all";

export function parsePeriod(v: string | undefined | null, todayYear: number): Period {
  if (v === "all") return "all";
  const n = Number(v);
  return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : todayYear;
}

export function periodLabel(p: Period): string {
  return p === "all" ? "seluruh klien terdaftar" : `klien terdaftar tahun ${p}`;
}

export function categoryOf(c: { clientType: string | null; occupation: string | null }): string {
  if (c.clientType === "Perusahaan") return COMPANY_CATEGORY;
  return normalizeOccupation(c.occupation);
}

export async function gatherClientOccupation(period: Period) {
  const range = period === "all" ? undefined : { gte: new Date(Date.UTC(period, 0, 1)), lt: new Date(Date.UTC(period + 1, 0, 1)) };
  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE", ...(range ? { createdAt: range } : {}) },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      clientNumber: true,
      fullName: true,
      clientType: true,
      companyName: true,
      occupation: true,
      city: true,
      createdAt: true,
      _count: { select: { jobs: true } }
    }
  });

  const counts = new Map<string, number>();
  const rows = clients.map((c) => {
    const category = categoryOf(c);
    counts.set(category, (counts.get(category) ?? 0) + 1);
    return { ...c, category };
  });
  // Urut: terbanyak dulu; "Belum diisi" selalu paling bawah agar mudah dilihat.
  const summary = [...counts.entries()]
    .map(([label, count]) => ({ label, count, pct: clients.length ? Math.round((count / clients.length) * 1000) / 10 : 0 }))
    .sort((a, b) => (a.label === EMPTY_CATEGORY ? 1 : b.label === EMPTY_CATEGORY ? -1 : b.count - a.count || a.label.localeCompare(b.label)));

  return {
    period,
    clients: rows,
    summary,
    total: clients.length,
    missing: counts.get(EMPTY_CATEGORY) ?? 0,
    companies: counts.get(COMPANY_CATEGORY) ?? 0
  };
}

export type ClientOccupationData = Awaited<ReturnType<typeof gatherClientOccupation>>;

const nihil = (rows: string[][], cols: number) => (rows.length ? rows : [["-", "NIHIL", ...Array(cols - 2).fill("")]]);

export function buildClientOccupationDocx(d: ClientOccupationData): Buffer {
  const judulPeriode = d.period === "all" ? "SELURUH KLIEN TERDAFTAR" : `TAHUN ${d.period}`;
  const blocks: DocBlock[] = [
    { t: "p", text: "LAPORAN TAHUNAN PEKERJAAN / PROFESI KLIEN", bold: true, align: "center", size: 13, spaceAfter: 0 },
    { t: "p", text: `KANTOR NOTARIS ${NOTARIS.namaSingkat.toUpperCase()}`, bold: true, align: "center", spaceAfter: 0 },
    { t: "p", text: judulPeriode, bold: true, align: "center", spaceAfter: 240 },
    {
      t: "p",
      align: "both",
      text: `Yang bertanda tangan di bawah ini, ${NOTARIS.namaLengkap}, ${NOTARIS.kedudukan}, dengan ini menyampaikan rekapitulasi pekerjaan/profesi para klien yang terdaftar pada kantor kami (${periodLabel(d.period)}), sebanyak ${d.total} klien, dengan rincian sebagai berikut:`
    },
    { t: "p", text: "A. REKAPITULASI PER JENIS PEKERJAAN", bold: true, spaceAfter: 60 },
    {
      t: "table",
      header: ["No.", "Pekerjaan / Profesi", "Jumlah Klien", "Persentase"],
      widths: [0.6, 4, 1.4, 1.4],
      rows: nihil(
        d.summary.map((s, i) => [String(i + 1), s.label, String(s.count), `${s.pct.toLocaleString("id-ID")} %`]).concat(d.total ? [["", "JUMLAH", String(d.total), "100 %"]] : []),
        4
      )
    },
    { t: "p", text: "B. DAFTAR KLIEN", bold: true, spaceAfter: 60 },
    {
      t: "table",
      header: ["No.", "No. Klien", "Nama Klien", "Pekerjaan / Profesi", "Kota", "Tgl. Terdaftar", "Jml. Pekerjaan di Kantor"],
      widths: [0.6, 1.4, 3.2, 2.6, 1.6, 1.5, 1.4],
      rows: nihil(
        d.clients.map((c, i) => [
          String(i + 1),
          c.clientNumber,
          c.companyName && c.companyName !== c.fullName ? `${c.fullName}\n${c.companyName}` : c.fullName,
          c.category,
          c.city ?? "-",
          formatDateJakarta(c.createdAt),
          String(c._count.jobs)
        ]),
        7
      )
    },
    { t: "p", text: "Demikian laporan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.", spaceAfter: 360 },
    ...signature()
  ];
  return buildSimpleDocx(blocks, { title: `Laporan Pekerjaan Klien ${d.period === "all" ? "Semua" : d.period}`, landscape: true });
}

export function buildClientOccupationXlsx(d: ClientOccupationData): Buffer {
  const label = d.period === "all" ? "Semua" : String(d.period);
  return buildSimpleXlsx(
    [
      {
        name: `Rekap ${label}`,
        header: ["Pekerjaan / Profesi", "Jumlah Klien", "Persentase (%)"],
        widths: [40, 14, 16],
        rows: [...d.summary.map((s) => [s.label, s.count, s.pct] as (string | number)[]), ["JUMLAH", d.total, 100], ["Dicetak", formatDateJakarta(getJakartaToday()), ""]]
      },
      {
        name: "Daftar Klien",
        header: ["No.", "No. Klien", "Nama Klien", "Nama Perusahaan", "Tipe", "Pekerjaan (isian)", "Pekerjaan (kelompok)", "Kota", "Tgl. Terdaftar", "Jml. Pekerjaan di Kantor"],
        widths: [5, 12, 34, 28, 12, 26, 26, 16, 14, 12],
        rows: d.clients.map((c, i) => [i + 1, c.clientNumber, c.fullName, c.companyName ?? "", c.clientType ?? "", c.occupation ?? "", c.category, c.city ?? "", formatDateJakarta(c.createdAt), c._count.jobs])
      }
    ],
    `Laporan Pekerjaan Klien ${label}`
  );
}
