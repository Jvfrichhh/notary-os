import { prisma } from "@/lib/prisma";

/**
 * Data untuk halaman Kantor AI (kantor virtual 12 agen).
 *
 * Sengaja HANYA berisi nomor pekerjaan, jenis layanan, status, jumlah checklist
 * dan judul/status tugas -- tanpa nama klien, NIK, alamat, atau deskripsi --
 * supaya aman ditampilkan di layar kantor. Bentuk field dibuat ringkas karena
 * dibaca engine kanvas di public/kantor-ai/engine.js.
 */
export type KantorAiJob = {
  id: string;
  /** Nomor pekerjaan, mis. JOB-2026-0001 */
  n: string;
  /** Nama jenis layanan */
  svc: string;
  /** JobStatus */
  st: string;
  /** Item checklist yang sudah lengkap */
  d: number;
  /** Total item checklist */
  t: number;
  /** Jam dibuat (WIB, HH:mm) */
  c: string;
  /** Tanggal dibuat (WIB, YYYY-MM-DD) */
  day: string;
  /** [judul tugas, TaskStatus] */
  tasks: [string, string][];
};

export type KantorAiSnapshot = {
  taken: string;
  day: string;
  source: string;
  jobs: KantorAiJob[];
};

const TZ = "Asia/Jakarta";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const takenFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

/** Batas atas agar query tetap ringan walau data bertambah. */
const MAX_JOBS = 500;

export async function getKantorAiSnapshot(): Promise<KantorAiSnapshot> {
  const jobs = await prisma.job.findMany({
    where: { recordStatus: "ACTIVE", status: { notIn: ["COMPLETED", "CANCELLED"] } },
    orderBy: { jobNumber: "asc" },
    take: MAX_JOBS,
    select: {
      id: true,
      jobNumber: true,
      status: true,
      createdAt: true,
      serviceType: { select: { name: true } },
      tasks: { select: { title: true, status: true }, orderBy: [{ createdAt: "asc" }, { title: "asc" }] },
      checklists: { select: { items: { select: { status: true } } } }
    }
  });

  const now = new Date();
  return {
    taken: `${takenFmt.format(now)} WIB`,
    day: dayFmt.format(now),
    source: "Nexora",
    jobs: jobs.map((j) => {
      const items = j.checklists.flatMap((c) => c.items);
      return {
        id: j.id,
        n: j.jobNumber,
        svc: j.serviceType?.name ?? "Pekerjaan",
        st: j.status,
        d: items.filter((i) => i.status === "COMPLETE").length,
        t: items.length,
        c: timeFmt.format(j.createdAt),
        day: dayFmt.format(j.createdAt),
        tasks: j.tasks.map((t): [string, string] => [t.title, t.status])
      };
    })
  };
}
