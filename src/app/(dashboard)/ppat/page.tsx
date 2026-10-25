import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatCurrency, formatDate, getJakartaYear } from "@/lib/format";
import { isSkmht, ppatDuty } from "@/lib/ppat";
import { unwrapProps, type Async } from "@/lib/pageProps";

export const dynamic = "force-dynamic";

/** Buku Daftar Akta PPAT per tahun. */
export default async function PpatRegisterPage(props: Async<{ searchParams: { year?: string } }>) {
  const { searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_REPERTORIUM);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);
  const year = Number(searchParams.year) || getJakartaYear();
  const [deeds, years] = await Promise.all([
    prisma.ppatDeed.findMany({
      where: { year, recordStatus: "ACTIVE" },
      orderBy: { sequence: "asc" },
      include: { job: { select: { id: true, jobNumber: true } } }
    }),
    prisma.ppatDeed.findMany({ distinct: ["year"], select: { year: true }, orderBy: { year: "desc" } })
  ]);
  const yearOptions = Array.from(new Set([getJakartaYear(), ...years.map((y) => y.year)])).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Buku Daftar Akta PPAT</h1>
          <p className="text-sm text-muted-foreground">
            Nomor akta PPAT berurut per tahun, terpisah dari repertorium notaris. Laporan bulanannya ada di menu Laporan Bulanan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex items-center gap-2">
            <select name="year" defaultValue={String(year)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              {yearOptions.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
              Tampilkan
            </button>
          </form>
          {canEdit && (
            <Link href="/ppat/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              + Daftarkan Akta PPAT
            </Link>
          )}
        </div>
      </div>

      <Card className="!p-0">
        {deeds.length === 0 ? (
          <div className="p-6">
            <EmptyState title={`Belum ada akta PPAT tahun ${year}.`} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-stack w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">No. Akta</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Perbuatan Hukum</th>
                  <th className="px-4 py-3 font-medium">Para Pihak</th>
                  <th className="px-4 py-3 font-medium">Objek</th>
                  <th className="px-4 py-3 font-medium">Nilai</th>
                  <th className="px-4 py-3 font-medium">Ke Kantor Pertanahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deeds.map((d) => {
                  const duty = ppatDuty(d.deedType, d.deedDate);
                  return (
                    <tr key={d.id} className="align-top hover:bg-muted/50">
                      <td data-label="No. Akta" className="px-4 py-3">
                        <Link href={`/ppat/${d.id}`} className="font-medium text-primary hover:underline">
                          {d.deedNumber}
                        </Link>
                        {d.job && <p className="text-xs text-muted-foreground">{d.job.jobNumber}</p>}
                      </td>
                      <td data-label="Tanggal" className="px-4 py-3 text-muted-foreground">{formatDate(d.deedDate)}</td>
                      <td data-label="Perbuatan Hukum" className="px-4 py-3">{d.deedType}</td>
                      <td data-label="Para Pihak" className="px-4 py-3 text-xs">
                        <div className="min-w-0">
                          <p>{d.partyFrom}</p>
                          <p className="text-muted-foreground">→ {d.partyTo}</p>
                        </div>
                      </td>
                      <td data-label="Objek" className="px-4 py-3 text-xs text-muted-foreground">
                        {[d.rightType, d.location, d.landArea ? `LT ${d.landArea} m²` : ""].filter(Boolean).join(" · ") || "-"}
                      </td>
                      <td data-label="Nilai" className="px-4 py-3 text-xs">{d.transactionValue ? formatCurrency(d.transactionValue) : "-"}</td>
                      <td data-label="Ke Kantor Pertanahan" className="px-4 py-3">
                        {d.submittedToBpnAt ? (
                          <span className="text-xs text-status-on-track">
                            {isSkmht(d.deedType) ? "APHT dibuat" : "Disampaikan"} {formatDate(d.submittedToBpnAt)}
                          </span>
                        ) : (
                          <StatusBadge tone={classifyDeadline(duty.due, "OPEN")} label={`Tenggat ${formatDate(duty.due)}`} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
