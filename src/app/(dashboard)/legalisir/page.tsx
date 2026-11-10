import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { unwrapProps, type Async } from "@/lib/pageProps";
import { getT } from "@/lib/i18n/server";
import { suggestRecordNumber, yearRange } from "@/lib/serviceRecordNumber";
import { createCopyCertification } from "@/app/(dashboard)/legalisir/actions";

export const dynamic = "force-dynamic";

const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default async function LegalisirPage(props: Async<{ searchParams?: { q?: string; err?: string; ok?: string } }>) {
  const { tp } = await getT();
  const { searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_LEGALISASI);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_LEGALISASI);
  const { t } = await getT();
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
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t("records.legalisir.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("records.legalisir.subtitle")}
        </p>
      </div>

      <Card className="!p-0">
        <form className="border-b border-border p-4">
          <input type="text" name="q" defaultValue={q} placeholder={t("records.legalisir.search")} className={`${field} sm:max-w-md`} />
        </form>
        {records.length === 0 ? (
          <div className="p-6">
            <EmptyState title={q ? t("records.common.noMatch") : t("records.legalisir.empty")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-stack w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("records.common.number")}</th>
                  <th className="px-4 py-3 font-medium">{t("records.common.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("records.legalisir.document")}</th>
                  <th className="px-4 py-3 font-medium">{t("records.legalisir.requester")}</th>
                  <th className="px-4 py-3 font-medium">{t("records.legalisir.copies")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td data-label={t("records.common.number")} className="px-4 py-3 font-medium text-foreground">{r.number}</td>
                    <td data-label={t("records.common.date")} className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
                    <td data-label={t("records.legalisir.document")} className="break-words px-4 py-3 text-foreground">{r.documentTitle}</td>
                    <td data-label={t("records.legalisir.requester")} className="px-4 py-3 text-foreground">{r.requesterName}</td>
                    <td data-label={t("records.legalisir.copies")} className="px-4 py-3 text-muted-foreground">{r.copies}</td>
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
            <h2 className="text-base font-bold text-foreground">{t("records.legalisir.formTitle")}</h2>
            {searchParams?.ok && <p className="text-xs text-status-on-track">{t("records.legalisir.saved")}</p>}
            {searchParams?.err === "invalid" && (
              <p role="alert" className="text-xs text-status-overdue">
                {t("records.legalisir.invalid")}
              </p>
            )}
            {searchParams?.err === "nomor" && (
              <p role="alert" className="text-xs text-status-overdue">
                {t("records.common.numberTaken")}
              </p>
            )}
            <form action={createCopyCertification} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.common.number")}</span>
                <input name="number" required maxLength={60} defaultValue={suggested} className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.common.date")}</span>
                <input name="date" type="date" required defaultValue={today.toISOString().slice(0, 10)} className={field} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.legalisir.fDocument")}</span>
                <input name="documentTitle" required minLength={2} maxLength={300} placeholder={tp("mis. Ijazah S1 atas nama ..., Sertipikat Hak Milik Nomor ...")} className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.legalisir.requester")}</span>
                <input name="requesterName" required minLength={2} className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.legalisir.fCopies")}</span>
                <input name="copies" type="number" min={1} max={999} defaultValue={1} className={field} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.common.notes")}</span>
                <textarea name="notes" rows={2} maxLength={1000} className={field} />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  {t("records.legalisir.submit")}
                </button>
                <p className="mt-2 text-xs text-muted-foreground">{t("records.common.immutable")}</p>
              </div>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
