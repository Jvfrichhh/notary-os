import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";
import { unwrapProps, type Async } from "@/lib/pageProps";
import { getT } from "@/lib/i18n/server";
import { suggestRecordNumber, yearRange } from "@/lib/serviceRecordNumber";
import { createProtes } from "@/app/(dashboard)/protes/actions";

export const dynamic = "force-dynamic";

const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default async function ProtesPage(props: Async<{ searchParams?: { q?: string; err?: string; ok?: string } }>) {
  const { searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_REPERTORIUM);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);
  const { t } = await getT();
  const q = searchParams?.q?.trim() ?? "";
  const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()) + "T00:00:00.000Z");

  const [records, numbers] = await Promise.all([
    prisma.protes.findMany({
      where: {
        recordStatus: "ACTIVE",
        ...(q
          ? {
              OR: [
                { number: { contains: q, mode: "insensitive" } },
                { requesterName: { contains: q, mode: "insensitive" } },
                { againstName: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { date: "desc" },
      take: 200
    }),
    prisma.protes.findMany({ where: { date: yearRange(today) }, select: { number: true } })
  ]);
  const suggested = suggestRecordNumber(numbers.map((n) => n.number), "P", today);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t("records.protes.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("records.protes.subtitle")}
        </p>
      </div>

      <Card className="!p-0">
        <form className="border-b border-border p-4">
          <input type="text" name="q" defaultValue={q} placeholder={t("records.protes.search")} className={`${field} sm:max-w-md`} />
        </form>
        {records.length === 0 ? (
          <div className="p-6">
            <EmptyState title={q ? t("records.common.noMatch") : t("records.protes.empty")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-stack w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("records.common.number")}</th>
                  <th className="px-4 py-3 font-medium">{t("records.common.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("records.protes.instrument")}</th>
                  <th className="px-4 py-3 font-medium">{t("records.protes.reason")}</th>
                  <th className="px-4 py-3 font-medium">{t("records.protes.requester")}</th>
                  <th className="px-4 py-3 font-medium">{t("records.protes.against")}</th>
                  <th className="px-4 py-3 font-medium">{t("records.common.amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td data-label={t("records.common.number")} className="px-4 py-3 font-medium text-foreground">{r.number}</td>
                    <td data-label={t("records.common.date")} className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
                    <td data-label={t("records.protes.instrument")} className="px-4 py-3 text-foreground">
                      {r.instrumentType}
                      {r.instrumentNumber ? ` ${r.instrumentNumber}` : ""}
                    </td>
                    <td data-label={t("records.protes.reason")} className="px-4 py-3 text-muted-foreground">{r.reason}</td>
                    <td data-label={t("records.protes.requester")} className="px-4 py-3 text-foreground">{r.requesterName}</td>
                    <td data-label={t("records.protes.against")} className="px-4 py-3 text-foreground">{r.againstName}</td>
                    <td data-label={t("records.common.amount")} className="px-4 py-3 text-muted-foreground">{r.amount ? formatCurrency(r.amount) : "-"}</td>
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
            <h2 className="text-base font-bold text-foreground">{t("records.protes.formTitle")}</h2>
            {searchParams?.ok && <p className="text-xs text-status-on-track">{t("records.protes.saved")}</p>}
            {searchParams?.err === "invalid" && (
              <p role="alert" className="text-xs text-status-overdue">
                {t("records.protes.invalid")}
              </p>
            )}
            {searchParams?.err === "nomor" && (
              <p role="alert" className="text-xs text-status-overdue">
                {t("records.common.numberTaken")}
              </p>
            )}
            <form action={createProtes} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.protes.fNumber")}</span>
                <input name="number" required maxLength={60} defaultValue={suggested} className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.common.date")}</span>
                <input name="date" type="date" required defaultValue={today.toISOString().slice(0, 10)} className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.protes.fRequester")}</span>
                <input name="requesterName" required minLength={2} className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.protes.fAgainst")}</span>
                <input name="againstName" required minLength={2} className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.protes.fInstrument")}</span>
                <select name="instrumentType" required defaultValue="Wesel" className={field}>
                  <option>Wesel</option>
                  <option>Cek</option>
                  <option>Surat Sanggup</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.protes.fReason")}</span>
                <select name="reason" required defaultValue="Non-pembayaran" className={field}>
                  <option>Non-pembayaran</option>
                  <option>Non-akseptasi</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.protes.fInstrumentNo")}</span>
                <input name="instrumentNumber" maxLength={80} className={field} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.protes.fAmount")}</span>
                <input name="amount" inputMode="numeric" placeholder="mis. 50000000" className={field} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">{t("records.common.notes")}</span>
                <textarea name="notes" rows={2} maxLength={1000} className={field} />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  {t("records.protes.submit")}
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
