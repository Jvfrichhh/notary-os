import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatDate, formatDateTime, getJakartaToday } from "@/lib/format";
import {
  gatherMonth,
  isYm,
  monthLabel,
  previousYm,
  REPORT_KINDS,
  REPORT_LABEL,
  reportDueDate,
  reportSentInfo,
  type ReportKind
} from "@/lib/compliance/monthly";
import { markReportSent } from "@/app/(dashboard)/compliance/actions";
import { unwrapProps, type Async } from "@/lib/pageProps";

export const dynamic = "force-dynamic";

const inputCls = "rounded-md border border-border bg-background px-3 py-2 text-sm";

/** Laporan bulanan wajib (MPD & Daftar Pusat Wasiat) + tenggat hukum setelah akta. */
export default async function CompliancePage(props: Async<{ searchParams: { month?: string; ok?: string } }>) {
  const { searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_REPERTORIUM);
  const canMark = await userHasPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);
  const today = getJakartaToday();
  const ym = isYm(searchParams.month) ? searchParams.month : previousYm(today);
  const data = await gatherMonth(ym);

  const kinds: ReportKind[] = REPORT_KINDS;
  const status = await Promise.all(kinds.map((k) => reportSentInfo(k, ym)));

  // Riwayat 6 bulan terakhir (status kirim laporan MPD).
  const history = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1 - i, 1));
      const m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      return reportSentInfo("mpd", m).then((s) => ({ m, s }));
    })
  );

  const tasks = await prisma.jobTask.findMany({
    where: { status: { not: "DONE" }, dueDate: { not: null }, job: { recordStatus: "ACTIVE", status: { not: "CANCELLED" } } },
    orderBy: { dueDate: "asc" },
    take: 100,
    select: {
      id: true,
      title: true,
      dueDate: true,
      assignee: { select: { name: true } },
      job: { select: { id: true, jobNumber: true, client: { select: { fullName: true } } } }
    }
  });

  const counts: Record<ReportKind, string> = {
    mpd: `${data.akta.length} akta · ${data.legalisasi.length} legalisasi · ${data.waarmerking.length} waarmerking · ${data.wasiat.length} wasiat`,
    wasiat: data.wasiat.length ? `${data.wasiat.length} akta wasiat` : "Tidak ada akta wasiat (laporan NIHIL)",
    ppat: data.ppat.length ? `${data.ppat.length} akta PPAT` : "Tidak ada akta PPAT (laporan NIHIL)"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Laporan Bulanan</h1>
          <p className="text-sm text-muted-foreground">
            Laporan wajib dibuat otomatis dari Repertorium, Legalisasi, Waarmerking, Wasiat, dan Buku Akta PPAT. Unduh, tanda tangani, kirim, lalu tandai terkirim.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <label>
            <span className="mb-1 block text-xs text-muted-foreground">Bulan</span>
            <input type="month" name="month" defaultValue={ym} className={inputCls} />
          </label>
          <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
            Tampilkan
          </button>
        </form>
      </div>

      {searchParams.ok && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm text-foreground">
          Laporan ditandai terkirim{searchParams.ok === "wasiat" ? "; akta wasiat bulan itu berstatus Dilaporkan" : ""}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {kinds.map((kind, i) => {
          const due = reportDueDate(kind, ym);
          const sent = status[i];
          return (
            <Card key={kind}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-foreground">{REPORT_LABEL[kind]}</h2>
                  <p className="text-xs text-muted-foreground">
                    Bulan {monthLabel(ym)} · tenggat {formatDate(due)}
                  </p>
                </div>
                {sent ? (
                  <span className="rounded-full bg-status-on-track/10 px-2.5 py-0.5 text-xs font-medium text-status-on-track">Terkirim</span>
                ) : (
                  <StatusBadge tone={classifyDeadline(due, "OPEN")} label={`Belum dikirim`} />
                )}
              </div>
              <p className="mb-3 text-sm text-foreground">{counts[kind]}</p>
              {sent && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Ditandai terkirim {formatDateTime(sent.at)}
                  {sent.by ? ` oleh ${sent.by}` : ""}
                  {sent.note ? ` · ${sent.note}` : ""}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/compliance/report?kind=${kind}&month=${ym}`}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Unduh Word
                </a>
                {canMark && !sent && (
                  <form action={markReportSent.bind(null, kind, ym)} className="flex flex-1 flex-wrap items-center gap-2">
                    <input name="note" maxLength={300} placeholder="Catatan (mis. dikirim via email/kurir)" className={`${inputCls} min-w-0 flex-1`} />
                    <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                      Tandai terkirim
                    </button>
                  </form>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="mb-3 text-base font-bold text-foreground">Status laporan MPD 6 bulan terakhir</h2>
        <div className="flex flex-wrap gap-2">
          {history.map(({ m, s }) => (
            <Link
              key={m}
              href={`/compliance?month=${m}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                s ? "border-status-on-track/40 text-status-on-track" : "border-status-overdue/40 text-status-overdue"
              }`}
            >
              {monthLabel(m)} · {s ? "terkirim" : "belum"}
            </Link>
          ))}
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-foreground">Tenggat Hukum & Tugas Bertenggat ({tasks.length})</h2>
          <p className="text-xs text-muted-foreground">
            Termasuk kewajiban setelah akta yang dibuat otomatis saat Sahkan (fidusia 30 hari, pengesahan PT 60 hari, perubahan PT 30 hari).
            Pengingat dikirim otomatis setiap pagi.
          </p>
        </div>
        {tasks.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Tidak ada tugas bertenggat yang terbuka.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/jobs/${t.job.id}`} className="font-medium text-primary hover:underline">
                    {t.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t.job.jobNumber} · {t.job.client.fullName} · {t.assignee?.name ?? "belum ditugaskan"}
                  </p>
                </div>
                <StatusBadge tone={classifyDeadline(t.dueDate, "OPEN")} label={`Tenggat ${formatDate(t.dueDate)}`} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
