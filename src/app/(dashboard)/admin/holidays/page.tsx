import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { unwrapProps, type Async } from "@/lib/pageProps";
import { addHoliday, removeHoliday } from "@/app/(dashboard)/admin/holidays/actions";

export const dynamic = "force-dynamic";

const field = "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default async function HolidaysPage(props: Async<{ searchParams?: { err?: string; ok?: string } }>) {
  const { tp } = await getT();
  const { searchParams } = await unwrapProps(props);
  await requirePermission(PERMISSIONS.MANAGE_USERS);
  const { t } = await getT();
  const from = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const rows = await prisma.holiday.findMany({ where: { date: { gte: from } }, orderBy: { date: "asc" } });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          {tp("← Admin")}
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t("records.holidays.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("records.holidays.subtitle")}
        </p>
      </div>

      <Card>
        {searchParams?.ok && <p className="mb-2 text-xs text-status-on-track">{t("records.holidays.saved")}</p>}
        {searchParams?.err === "invalid" && (
          <p role="alert" className="mb-2 text-xs text-status-overdue">
            {t("records.holidays.invalid")}
          </p>
        )}
        <form action={addHoliday} className="flex flex-wrap items-end gap-2">
          <label>
            <span className="mb-1 block text-xs text-muted-foreground">{t("records.common.date")}</span>
            <input type="date" name="date" required className={field} />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-muted-foreground">{t("records.holidays.name")}</span>
            <input name="name" required minLength={2} maxLength={120} placeholder={t("records.holidays.namePlaceholder")} className={`${field} w-full`} />
          </label>
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            {t("records.common.add")}
          </button>
        </form>
      </Card>

      <Card className="!p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("records.holidays.empty")}</p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{formatDate(r.date)}</span>
                  <span className="text-muted-foreground"> · {r.name}</span>
                </div>
                <form action={removeHoliday.bind(null, r.id)}>
                  <ConfirmButton message={t("records.holidays.confirmDelete")} className="text-xs text-status-overdue hover:underline">
                    {t("records.common.delete")}
                  </ConfirmButton>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
