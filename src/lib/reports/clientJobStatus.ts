import type { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { JOB_STATUSES } from "@/lib/jobStatus";
import { NOTARIS } from "@/lib/deeds/common";
import { buildSimpleDocx, type DocBlock } from "@/lib/office/simpleDocx";
import { buildSimpleXlsx } from "@/lib/office/simpleXlsx";
import { signature } from "@/lib/compliance/monthly";
import { formatDate, formatDateJakarta, formatStatusLabel, getJakartaToday } from "@/lib/format";

/**
 * Laporan tahunan STATUS PEKERJAAN KLIEN: semua pekerjaan yang masuk pada
 * tahun tertentu, dikelompokkan per klien, berikut status terakhirnya.
 * Dipakai untuk laporan tahunan Notaris (PKJM). Data diambil apa adanya dari
 * tabel pekerjaan -- tidak ada tabel baru; unduhan dicatat di audit log.
 */

export function isYear(v: string | undefined | null): v is string {
  return !!v && /^\d{4}$/.test(v) && Number(v) >= 2000 && Number(v) <= 2100;
}

export function yearRange(year: number): { start: Date; end: Date } {
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year + 1, 0, 1)) };
}

export async function gatherClientJobStatus(year: number) {
  const { start, end } = yearRange(year);
  const jobs = await prisma.job.findMany({
    where: { recordStatus: "ACTIVE", createdAt: { gte: start, lt: end } },
    orderBy: [{ client: { fullName: "asc" } }, { createdAt: "asc" }],
    select: {
      id: true,
      jobNumber: true,
      description: true,
      status: true,
      createdAt: true,
      startDate: true,
      deadline: true,
      completionDate: true,
      serviceType: { select: { name: true } },
      pic: { select: { name: true } },
      client: { select: { id: true, clientNumber: true, fullName: true, clientType: true, companyName: true } }
    }
  });

  const byStatus = Object.fromEntries(JOB_STATUSES.map((s) => [s, 0])) as Record<JobStatus, number>;
  for (const j of jobs) byStatus[j.status]++;

  const clientMap = new Map<string, { client: (typeof jobs)[number]["client"]; jobs: typeof jobs }>();
  for (const j of jobs) {
    const g = clientMap.get(j.client.id) ?? { client: j.client, jobs: [] };
    g.jobs.push(j);
    clientMap.set(j.client.id, g);
  }
  const clients = [...clientMap.values()];
  const active = jobs.filter((j) => j.status !== "COMPLETED" && j.status !== "CANCELLED").length;

  return { year, jobs, clients, byStatus, total: jobs.length, active, completed: byStatus.COMPLETED, cancelled: byStatus.CANCELLED };
}

export type ClientJobStatusData = Awaited<ReturnType<typeof gatherClientJobStatus>>;

const clientLabel = (c: ClientJobStatusData["clients"][number]["client"]) =>
  c.companyName && c.companyName !== c.fullName ? `${c.fullName} (${c.companyName})` : c.fullName;

function detailRows(d: ClientJobStatusData): string[][] {
  const rows: string[][] = [];
  let no = 0;
  for (const g of d.clients) {
    g.jobs.forEach((j, i) => {
      no++;
      rows.push([
        String(no),
        i === 0 ? `${clientLabel(g.client)}\n${g.client.clientNumber}` : "",
        j.jobNumber,
        j.serviceType?.name ?? (j.description ?? "-"),
        formatDateJakarta(j.createdAt),
        formatStatusLabel(j.status),
        j.status === "COMPLETED" ? formatDate(j.completionDate) : formatDate(j.deadline),
        j.pic?.name ?? "-"
      ]);
    });
  }
  return rows.length ? rows : [["-", "NIHIL", "", "", "", "", "", ""]];
}

export function buildClientJobStatusDocx(d: ClientJobStatusData): Buffer {
  const blocks: DocBlock[] = [
    { t: "p", text: `LAPORAN TAHUNAN STATUS PEKERJAAN KLIEN`, bold: true, align: "center", size: 13, spaceAfter: 0 },
    { t: "p", text: `KANTOR NOTARIS ${NOTARIS.namaSingkat.toUpperCase()}`, bold: true, align: "center", spaceAfter: 0 },
    { t: "p", text: `TAHUN ${d.year}`, bold: true, align: "center", spaceAfter: 240 },
    {
      t: "p",
      align: "both",
      text: `Yang bertanda tangan di bawah ini, ${NOTARIS.namaLengkap}, ${NOTARIS.kedudukan}, dengan ini menyampaikan rekapitulasi status pekerjaan para klien yang terdaftar pada kantor kami selama tahun ${d.year}, dengan rincian sebagai berikut:`
    },
    { t: "p", text: "A. REKAPITULASI", bold: true, spaceAfter: 60 },
    {
      t: "table",
      header: ["Keterangan", "Jumlah"],
      widths: [4, 1],
      rows: [
        ["Jumlah klien yang mendaftarkan pekerjaan", String(d.clients.length)],
        ["Jumlah pekerjaan masuk", String(d.total)],
        ...JOB_STATUSES.map((s) => [`   ${formatStatusLabel(s)}`, String(d.byStatus[s])]),
        ["Pekerjaan masih berjalan (belum selesai/dibatalkan)", String(d.active)]
      ]
    },
    { t: "p", text: `B. RINCIAN PER KLIEN`, bold: true, spaceAfter: 60 },
    {
      t: "table",
      header: ["No.", "Klien", "No. Pekerjaan", "Jenis Layanan", "Tgl. Masuk", "Status", "Tgl. Selesai / Tenggat", "PIC"],
      widths: [0.5, 2.6, 1.6, 2.4, 1.3, 1.8, 1.5, 1.4],
      rows: detailRows(d)
    },
    { t: "p", text: "Demikian laporan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.", spaceAfter: 360 },
    ...signature()
  ];
  return buildSimpleDocx(blocks, { title: `Laporan Status Pekerjaan Klien ${d.year}`, landscape: true });
}

export function buildClientJobStatusXlsx(d: ClientJobStatusData): Buffer {
  const rincian: (string | number)[][] = [];
  let no = 0;
  for (const g of d.clients) {
    for (const j of g.jobs) {
      no++;
      rincian.push([
        no,
        g.client.clientNumber,
        clientLabel(g.client),
        g.client.clientType ?? "",
        j.jobNumber,
        j.serviceType?.name ?? "",
        j.description ?? "",
        formatDateJakarta(j.createdAt),
        formatStatusLabel(j.status),
        formatDate(j.deadline),
        formatDate(j.completionDate),
        j.pic?.name ?? ""
      ]);
    }
  }
  return buildSimpleXlsx(
    [
      {
        name: `Rekap ${d.year}`,
        header: ["Keterangan", "Jumlah"],
        widths: [52, 10],
        rows: [
          ["Jumlah klien yang mendaftarkan pekerjaan", d.clients.length],
          ["Jumlah pekerjaan masuk", d.total],
          ...JOB_STATUSES.map((s) => [formatStatusLabel(s), d.byStatus[s]] as (string | number)[]),
          ["Pekerjaan masih berjalan", d.active],
          ["Dicetak", formatDate(getJakartaToday())]
        ]
      },
      {
        name: "Rincian per Klien",
        header: ["No.", "No. Klien", "Nama Klien", "Tipe", "No. Pekerjaan", "Jenis Layanan", "Uraian", "Tgl. Masuk", "Status", "Tenggat", "Tgl. Selesai", "PIC"],
        widths: [5, 12, 34, 10, 16, 28, 36, 13, 20, 13, 13, 18],
        rows: rincian
      }
    ],
    `Laporan Status Pekerjaan Klien ${d.year}`
  );
}
