import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatDateTime, formatFileSize, getJakartaYear } from "@/lib/format";
import { listArchives } from "@/lib/compliance/backup";
import { createBackupNow, exportProtocol } from "@/app/(dashboard)/backup/actions";

export const dynamic = "force-dynamic";
// Ekspor protokol mengambil banyak file dari storage; beri waktu lebih.
export const maxDuration = 60;

const ERR: Record<string, string> = {
  backup: "Backup gagal dibuat. Coba lagi beberapa saat lagi.",
  export: "Ekspor protokol gagal. Coba lagi; bila berulang, ekspor per tahun yang lebih sedikit aktanya.",
  year: "Tahun tidak valid."
};

/** Backup database & ekspor protokol notaris (khusus Notaris). */
export default async function BackupPage({ searchParams }: { searchParams: { ok?: string; err?: string; missing?: string } }) {
  await requirePermission(PERMISSIONS.MANAGE_USERS);
  const archives = await listArchives();
  const years = await prisma.repertorium.findMany({ distinct: ["year"], select: { year: true }, orderBy: { year: "desc" } });
  const yearOptions = Array.from(new Set([getJakartaYear(), ...years.map((y) => y.year)])).sort((a, b) => b - a);
  const lastBackup = archives.find((a) => a.action === "backup_created");
  const stale = !lastBackup || Date.now() - lastBackup.timestamp.getTime() > 8 * 86400000;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Backup & Ekspor Protokol</h1>
        <p className="text-sm text-muted-foreground">
          Protokol notaris wajib disimpan selamanya. Sistem membuat backup database otomatis tiap minggu; unduh secara berkala dan simpan di luar
          cloud (harddisk kantor / Google Drive kantor).
        </p>
        {/* Versi mesin server: untuk memastikan pembaruan keamanan Node.js sudah aktif. */}
        <p className="mt-1 text-xs text-muted-foreground">Versi Node.js server: {process.version}</p>
      </div>

      {searchParams.ok === "backup" && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm">Backup dibuat. Unduh dari daftar di bawah.</div>
      )}
      {searchParams.ok === "export" && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm">
          Ekspor protokol selesai. Unduh dari daftar di bawah.
          {searchParams.missing && searchParams.missing !== "0" && ` ${searchParams.missing} file Minuta/Salinan tidak tersedia (lihat BACA_SAYA.txt di dalam ZIP).`}
        </div>
      )}
      {searchParams.err && ERR[searchParams.err] && (
        <div role="alert" className="rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2 text-sm">
          {ERR[searchParams.err]}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-base font-bold text-foreground">Backup database</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Seluruh data (klien, pekerjaan, akta, repertorium, dsb.) dalam satu file ZIP. Otomatis setiap 7 hari.
          </p>
          <p className={`mb-3 text-sm ${stale ? "text-status-overdue" : "text-foreground"}`}>
            Backup terakhir: {lastBackup ? formatDateTime(lastBackup.timestamp) : "belum pernah"}
          </p>
          <form action={createBackupNow}>
            <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Buat backup sekarang
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-1 text-base font-bold text-foreground">Ekspor protokol per tahun</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            File Word Minuta & Salinan semua akta tahun itu + Repertorium, Klapper, dan daftar Legalisasi/Waarmerking/Wasiat.
          </p>
          <form action={exportProtocol} className="flex items-center gap-2">
            <select name="year" className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Ekspor
            </button>
          </form>
        </Card>
      </div>

      <Card className="p-0">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-foreground">Riwayat backup & ekspor</h2>
          <p className="text-xs text-muted-foreground">File berisi data pribadi klien; simpan di tempat aman dan jangan dibagikan.</p>
        </div>
        {archives.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Belum ada backup.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {archives.map((a) => {
              const v = (a.newValue ?? {}) as { size?: number; trigger?: string; year?: number; deeds?: number; rows?: number };
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {a.action === "backup_created" ? `Backup database${v.trigger === "otomatis" ? " (otomatis)" : ""}` : `Protokol tahun ${v.year}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(a.timestamp)} · {a.user?.name ?? "Sistem"}
                      {v.size ? ` · ${formatFileSize(v.size)}` : ""}
                      {a.action === "protocol_exported" && v.deeds !== undefined ? ` · ${v.deeds} akta` : ""}
                      {a.action === "backup_created" && v.rows !== undefined ? ` · ${v.rows} baris data` : ""}
                    </p>
                  </div>
                  <a href={`/api/archive-file?key=${encodeURIComponent(a.entityId)}`} className="text-sm font-medium text-primary hover:underline">
                    Unduh
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
