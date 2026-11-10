import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { unwrapProps, type Async } from "@/lib/pageProps";
import { suggestRecordNumber, yearRange } from "@/lib/serviceRecordNumber";
import { createCopyCertification } from "@/app/(dashboard)/legalisir/actions";

export const dynamic = "force-dynamic";

const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default async function LegalisirPage(props: Async<{ searchParams?: { q?: string; err?: string; ok?: string } }>) {
  const { searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_LEGALISASI);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_LEGALISASI);
  const q = searchParams?.q?.trim() ?? "";
  const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()) + "T00:00:00.000Z");

  const [records, numbers] = await Promise.all([
    prisma.copyCertification.findMany({
      where: {
        recordStatus: "ACTIVE",
        ...(q
          ? {
              OR: [
                { number: { contains: q, mode: "insensitive" } },
                { requesterName: { contains: q, mode: "insensitive" } },
                { documentTitle: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { date: "desc" },
      take: 200
    }),
    prisma.copyCertification.findMany({ where: { date: yearRange(today) }, select: { number: true } })
  ]);
  const suggested = suggestRecordNumber(numbers.map((n) => n.number), "LF", today);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Legalisir Fotokopi</h1>
        <p className="text-sm text-muted-foreground">
          Daftar pengesahan kecocokan fotokopi dengan surat aslinya. Berbeda dari Legalisasi (pengesahan tanda tangan) dan Waarmerking
          (pembukuan surat di bawah tangan).
        </p>
      </div>

      <Card className="!p-0">
        <form className="border-b border-border p-4">
          <input type="text" name="q" defaultValue={q} placeholder="Cari nomor, pemohon, nama dokumen..." className={`${field} sm:max-w-md`} />
        </form>
        {records.length === 0 ? (
          <div className="p-6">
            <EmptyState title={q ? "Tidak ada catatan yang cocok." : "Belum ada legalisir fotokopi yang dicatat."} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-stack w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nomor</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Dokumen</th>
                  <th className="px-4 py-3 font-medium">Pemohon</th>
                  <th className="px-4 py-3 font-medium">Rangkap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td data-label="Nomor" className="px-4 py-3 font-medium text-foreground">{r.number}</td>
                    <td data-label="Tanggal" className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
                    <td data-label="Dokumen" className="break-words px-4 py-3 text-foreground">{r.documentTitle}</td>
                    <td data-label="Pemohon" className="px-4 py-3 text-foreground">{r.requesterName}</td>
                    <td data-label="Rangkap" className="px-4 py-3 text-muted-foreground">{r.copies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canEdit && (
        <Card>
          <div id="catat" className="scroll-mt-24 space-y-3">
            <h2 className="text-base font-bold text-foreground">Catat Legalisir Fotokopi</h2>
            {searchParams?.ok && <p className="text-xs text-status-on-track">Legalisir fotokopi dicatat.</p>}
            {searchParams?.err === "invalid" && (
              <p role="alert" className="text-xs text-status-overdue">
                Lengkapi nomor, tanggal, pemohon, dan nama dokumen.
              </p>
            )}
            {searchParams?.err === "nomor" && (
              <p role="alert" className="text-xs text-status-overdue">
                Nomor itu sudah dipakai.
              </p>
            )}
            <form action={createCopyCertification} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Nomor</span>
                <input name="number" required maxLength={60} defaultValue={suggested} className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Tanggal</span>
                <input name="date" type="date" required defaultValue={today.toISOString().slice(0, 10)} className={field} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">Dokumen yang difotokopi</span>
                <input name="documentTitle" required minLength={2} maxLength={300} placeholder="mis. Ijazah S1 atas nama ..., Sertipikat Hak Milik Nomor ..." className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Pemohon</span>
                <input name="requesterName" required minLength={2} className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Jumlah rangkap</span>
                <input name="copies" type="number" min={1} max={999} defaultValue={1} className={field} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">Catatan</span>
                <textarea name="notes" rows={2} maxLength={1000} className={field} />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Catat
                </button>
                <p className="mt-2 text-xs text-muted-foreground">Catatan tidak bisa dihapus dan nomornya tidak bisa diubah. Periksa sebelum menyimpan.</p>
              </div>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
