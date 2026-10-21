import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFileStorage } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { zip } from "@/lib/deeds/zip";
import { buildSimpleDocx, type DocBlock } from "@/lib/office/simpleDocx";
import { formatDate } from "@/lib/format";
import { NOTARIS } from "@/lib/deeds/common";

/**
 * Backup database (semua tabel sebagai JSON dalam satu ZIP) dan ekspor
 * protokol notaris per tahun (Minuta & Salinan + Repertorium, Klapper, daftar
 * lain). Hasil disimpan di folder backups/ dan exports/ pada storage, dicatat
 * di audit log, dan bisa diunduh Notaris untuk disimpan di luar cloud
 * (harddisk / Google Drive kantor).
 */

const ZIP_MIME = "application/zip";
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").slice(0, 13); // YYYYMMDDTHHMM

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Semua tabel -> JSON. Hash password ikut tersimpan: file backup bersifat RAHASIA. */
export async function createDatabaseBackup(userId: string | null, trigger: "manual" | "otomatis") {
  const files: { name: string; data: string }[] = [];
  const counts: Record<string, number> = {};
  for (const name of Object.values(Prisma.ModelName)) {
    const delegate = (prisma as unknown as Record<string, { findMany: (args?: unknown) => Promise<unknown[]> }>)[lowerFirst(name)];
    if (!delegate?.findMany) continue;
    const rows = await delegate.findMany();
    counts[name] = rows.length;
    files.push({ name: `tabel/${name}.json`, data: JSON.stringify(rows, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 1) });
  }
  const manifest = {
    aplikasi: "Notary OS",
    kantor: NOTARIS.namaSingkat,
    dibuat: new Date().toISOString(),
    pemicu: trigger,
    jumlahBaris: counts,
    catatan: "Berisi data pribadi klien dan hash password. Simpan di tempat aman; jangan dibagikan."
  };
  files.unshift({ name: "MANIFEST.json", data: JSON.stringify(manifest, null, 2) });
  const buffer = zip(files);
  const upload = await getFileStorage().upload({ buffer, fileName: `backup-${stamp()}.zip`, contentType: ZIP_MIME, folder: "backups" });
  await writeAuditLog({
    userId,
    action: "backup_created",
    entityType: "Backup",
    entityId: upload.storageKey,
    newValue: { size: upload.size, trigger, tables: Object.keys(counts).length, rows: Object.values(counts).reduce((a, b) => a + b, 0) }
  });
  return upload;
}

export async function lastBackupAt(): Promise<Date | null> {
  const log = await prisma.auditLog.findFirst({ where: { action: "backup_created" }, orderBy: { timestamp: "desc" }, select: { timestamp: true } });
  return log?.timestamp ?? null;
}

/** Riwayat backup & ekspor (terbaru dulu). */
export async function listArchives() {
  return prisma.auditLog.findMany({
    where: { action: { in: ["backup_created", "protocol_exported"] } },
    orderBy: { timestamp: "desc" },
    take: 30,
    select: { id: true, action: true, entityId: true, timestamp: true, newValue: true, user: { select: { name: true } } }
  });
}

/** storageKey yang boleh diunduh lewat halaman Backup (hanya hasil backup/ekspor). */
export function isArchiveKey(key: string): boolean {
  return /^(backups|exports)\/[A-Za-z0-9._-]+$/.test(key);
}

const safe = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);

/** Ekspor protokol satu tahun: file Minuta & Salinan + register dalam Word. */
export async function exportProtocolYear(year: number, userId: string) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const range = { gte: start, lt: end };
  const storage = getFileStorage();

  const [repertorium, legalisasi, waarmerking, wasiat] = await Promise.all([
    prisma.repertorium.findMany({
      where: { year, recordStatus: "ACTIVE" },
      orderBy: { sequenceNumber: "asc" },
      select: {
        sequenceNumber: true,
        deedDate: true,
        deedType: true,
        appearerName: true,
        deed: {
          select: {
            deedNumber: true,
            minuta: { where: { recordStatus: "ACTIVE" }, select: { document: { select: { storageKey: true, fileName: true } } } },
            salinan: { where: { recordStatus: "ACTIVE" }, select: { document: { select: { storageKey: true, fileName: true } } } }
          }
        }
      }
    }),
    prisma.legalisasi.findMany({ where: { date: range, recordStatus: "ACTIVE" }, orderBy: { date: "asc" }, select: { number: true, date: true, serviceType: true, client: { select: { fullName: true } } } }),
    prisma.waarmerking.findMany({ where: { date: range, recordStatus: "ACTIVE" }, orderBy: { date: "asc" }, select: { number: true, date: true, serviceType: true, client: { select: { fullName: true } } } }),
    prisma.wasiat.findMany({ where: { date: range, recordStatus: "ACTIVE" }, orderBy: { date: "asc" }, select: { deedNumber: true, date: true, wasiatType: true, client: { select: { fullName: true } } } })
  ]);

  const files: { name: string; data: Buffer | string }[] = [];
  const missing: string[] = [];
  for (const r of repertorium) {
    const prefix = `${String(r.sequenceNumber).padStart(4, "0")}_${safe(r.deed.deedNumber)}`;
    for (const [folder, items] of [
      ["Minuta", r.deed.minuta],
      ["Salinan", r.deed.salinan]
    ] as const) {
      for (const it of items) {
        if (!it.document) continue;
        try {
          files.push({ name: `${folder}/${prefix}_${safe(it.document.fileName)}`, data: await storage.getObjectBuffer(it.document.storageKey) });
        } catch {
          missing.push(`${folder} ${r.deed.deedNumber}`);
        }
      }
    }
    if (r.deed.minuta.length === 0) missing.push(`Minuta ${r.deed.deedNumber} (belum ada file)`);
  }

  const title = (t: string): DocBlock => ({ t: "p", text: t, bold: true, align: "center" });
  files.push({
    name: `Repertorium_${year}.docx`,
    data: buildSimpleDocx(
      [
        title(`REPERTORIUM TAHUN ${year}`),
        { t: "p", text: `${NOTARIS.namaSingkat} — ${NOTARIS.kedudukan}`, align: "center", spaceAfter: 240 },
        {
          t: "table",
          header: ["No. Urut", "No. Akta", "Tanggal", "Sifat Akta", "Nama Penghadap / Pihak"],
          widths: [1, 1.3, 1.4, 3, 4],
          rows: repertorium.map((r) => [String(r.sequenceNumber), r.deed.deedNumber, formatDate(r.deedDate), r.deedType, r.appearerName])
        }
      ],
      { title: `Repertorium ${year}` }
    )
  });
  const klapper = repertorium
    .flatMap((r) => r.appearerName.split(/,\s*/).filter(Boolean).map((n) => ({ n: n.trim(), r })))
    .sort((a, b) => a.n.localeCompare(b.n, "id"));
  files.push({
    name: `Klapper_${year}.docx`,
    data: buildSimpleDocx(
      [
        title(`KLAPPER (DAFTAR NAMA PENGHADAP) TAHUN ${year}`),
        {
          t: "table",
          header: ["Nama Penghadap / Pihak", "Sifat Akta", "No. Akta", "Tanggal", "No. Urut"],
          widths: [4, 3, 1.3, 1.4, 1],
          rows: klapper.map(({ n, r }) => [n, r.deedType, r.deed.deedNumber, formatDate(r.deedDate), String(r.sequenceNumber)])
        }
      ],
      { title: `Klapper ${year}` }
    )
  });
  const reg = (rows: { number?: string | null; deedNumber?: string | null; date: Date | null; serviceType?: string | null; wasiatType?: string | null; client: { fullName: string } }[]) =>
    rows.map((r, i) => [String(i + 1), r.number ?? r.deedNumber ?? "-", formatDate(r.date), r.serviceType ?? r.wasiatType ?? "-", r.client.fullName]);
  const header = ["No.", "Nomor", "Tanggal", "Jenis", "Nama Pihak"];
  files.push({
    name: `Daftar_Lain_${year}.docx`,
    data: buildSimpleDocx(
      [
        title(`DAFTAR LEGALISASI TAHUN ${year}`),
        { t: "table", header, widths: [0.6, 1.8, 1.4, 3, 3.5], rows: reg(legalisasi) },
        title(`DAFTAR WAARMERKING TAHUN ${year}`),
        { t: "table", header, widths: [0.6, 1.8, 1.4, 3, 3.5], rows: reg(waarmerking) },
        title(`DAFTAR AKTA WASIAT TAHUN ${year}`),
        { t: "table", header, widths: [0.6, 1.8, 1.4, 3, 3.5], rows: reg(wasiat) }
      ],
      { title: `Daftar Lain ${year}` }
    )
  });
  files.unshift({
    name: "BACA_SAYA.txt",
    data: [
      `Protokol Notaris tahun ${year} — ${NOTARIS.namaSingkat}`,
      `Diekspor: ${new Date().toISOString()}`,
      `Akta: ${repertorium.length}; Legalisasi: ${legalisasi.length}; Waarmerking: ${waarmerking.length}; Wasiat: ${wasiat.length}`,
      missing.length ? `File tidak tersedia: ${missing.join("; ")}` : "Semua file Minuta/Salinan tersedia.",
      "Minuta asli (bertanda tangan) tetap wajib disimpan secara fisik; file ini salinan digital."
    ].join("\r\n")
  });

  const upload = await storage.upload({ buffer: zip(files), fileName: `protokol-${year}-${stamp()}.zip`, contentType: ZIP_MIME, folder: "exports" });
  await writeAuditLog({
    userId,
    action: "protocol_exported",
    entityType: "Backup",
    entityId: upload.storageKey,
    newValue: { year, size: upload.size, deeds: repertorium.length, missing: missing.length }
  });
  return { ...upload, deeds: repertorium.length, missing };
}
