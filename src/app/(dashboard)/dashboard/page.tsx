import { getT } from "@/lib/i18n/server";
import { INTL_TAG, type Locale, type Translator } from "@/lib/i18n";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DonutChart } from "@/components/charts/DonutChart";
import { CountUp } from "@/components/motion/CountUp";
import { classifyDeadline, formatDate, formatStatusLabel, getJakartaToday } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getUserPermissions, PERMISSIONS } from "@/lib/permissions";
import { AlertTriangle, Plus, ShieldAlert } from "lucide-react";
import { gatherMonth, monthLabel, previousYm, REPORT_DUE_DAY, reportSentInfo } from "@/lib/compliance/monthly";
import { unwrapProps, type Async } from "@/lib/pageProps";

/** Pengingat Notaris: laporan bulanan bulan lalu yang belum terkirim & tugas bertenggat terlambat. */
async function getComplianceAlerts() {
  const today = getJakartaToday();
  const ym = previousYm(today);
  const [mpd, wasiatSent, ppatSent, data, lateTasks] = await Promise.all([
    reportSentInfo("mpd", ym),
    reportSentInfo("wasiat", ym),
    reportSentInfo("ppat", ym),
    gatherMonth(ym),
    prisma.jobTask.count({ where: { status: { not: "DONE" }, dueDate: { lt: today }, job: { recordStatus: "ACTIVE", status: { not: "CANCELLED" } } } })
  ]);
  const alerts: string[] = [];
  if (!mpd) alerts.push(`Laporan bulanan MPD ${monthLabel(ym)} belum terkirim (tenggat tanggal ${REPORT_DUE_DAY.mpd}).`);
  if (!wasiatSent && data.wasiat.length > 0)
    alerts.push(`Laporan ${data.wasiat.length} akta wasiat ${monthLabel(ym)} ke Daftar Pusat Wasiat belum terkirim (tenggat tanggal ${REPORT_DUE_DAY.wasiat}).`);
  if (!ppatSent) alerts.push(`Laporan bulanan PPAT ${monthLabel(ym)} belum terkirim (tenggat tanggal ${REPORT_DUE_DAY.ppat}).`);
  if (lateTasks > 0) alerts.push(`${lateTasks} tugas bertenggat (termasuk kewajiban hukum setelah akta) sudah lewat tenggat.`);
  return alerts;
}

export const dynamic = "force-dynamic";

// "Hari ini" versi kantor (Asia/Jakarta), bukan timezone server -- konsisten
// dengan classifyDeadline yang dipakai di Deadlines/Calendar/Joblist.
function getTodayRange() {
  const startOfToday = getJakartaToday();
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  return { startOfToday, startOfTomorrow };
}

// Statistik job -- HANYA dipanggil kalau user punya view_jobs. Query dipisah
// dari statistik kunjungan supaya server tidak mengeksekusi query untuk data
// yang tidak boleh dilihat user (pembatasan di sisi data, bukan cuma tampilan).
async function getJobStats(userId: string) {
  const { startOfToday, startOfTomorrow } = getTodayRange();
  // Hanya job aktif (bukan yang diarsipkan) yang dihitung.
  const active = { recordStatus: "ACTIVE" as const };
  const open = { ...active, status: { notIn: ["COMPLETED", "CANCELLED"] as ("COMPLETED" | "CANCELLED")[] } };

  const [totalJobs, inProgress, dueToday, overdue, completed, waitingReview, myOpen] = await Promise.all([
    prisma.job.count({ where: active }),
    prisma.job.count({ where: { ...active, status: "IN_PROGRESS" } }),
    prisma.job.count({ where: { ...open, deadline: { gte: startOfToday, lt: startOfTomorrow } } }),
    prisma.job.count({ where: { ...open, deadline: { lt: startOfToday } } }),
    prisma.job.count({ where: { ...active, status: "COMPLETED" } }),
    prisma.job.count({ where: { ...active, status: "REVIEW" } }),
    prisma.job.count({ where: { ...open, picId: userId } })
  ]);

  return { totalJobs, inProgress, dueToday, overdue, completed, waitingReview, myOpen };
}

async function getRecentJobs() {
  return prisma.job.findMany({
    where: { recordStatus: "ACTIVE" },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { client: true, pic: true, serviceType: { select: { name: true } } }
  });
}

/** Tugas bertenggat terdekat (termasuk yang sudah lewat) untuk kolom kanan dashboard. */
async function getUpcomingTasks() {
  const soon = new Date(getJakartaToday().getTime() + 14 * 86400000);
  return prisma.jobTask.findMany({
    where: {
      status: { not: "DONE" },
      dueDate: { not: null, lte: soon },
      job: { recordStatus: "ACTIVE", status: { notIn: ["COMPLETED", "CANCELLED"] } }
    },
    orderBy: { dueDate: "asc" },
    take: 5,
    select: { id: true, title: true, dueDate: true, assignee: { select: { name: true } }, job: { select: { id: true, jobNumber: true } } }
  });
}

/** Pekerjaan berjalan per status, urut sesuai alur kerja (warna mengikuti status, bukan peringkat). */
const STATUS_SLICES = [
  { status: "INBOX", color: "var(--series-blue)" },
  { status: "IN_PROGRESS", color: "var(--series-orange)" },
  { status: "WAITING_FOR_CLIENT", color: "var(--series-aqua)" },
  { status: "WAITING_FOR_DOCUMENT", color: "var(--series-yellow)" },
  { status: "REVIEW", color: "var(--series-magenta)" },
  { status: "READY_FOR_SIGNING", color: "var(--series-violet)" }
] as const;

async function getStatusBreakdown(t: Translator) {
  const rows = await prisma.job.groupBy({
    by: ["status"],
    _count: { _all: true },
    where: { recordStatus: "ACTIVE", status: { notIn: ["COMPLETED", "CANCELLED"] } }
  });
  const count = new Map(rows.map((r) => [r.status as string, r._count._all]));
  return STATUS_SLICES.map((s) => ({ label: t(`dashboard.status.${s.status}`), color: s.color, value: count.get(s.status) ?? 0, href: `/jobs?status=${s.status}` }));
}

const DEADLINE_TONE = {
  overdue: "bg-danger-soft text-status-overdue",
  "due-today": "bg-warn-soft text-status-due-today",
  "due-soon": "bg-warn-soft text-status-due-today",
  "on-track": "bg-muted text-foreground",
  archived: "bg-muted text-foreground"
} as const;

const MONTH_SHORT: Record<Locale, string[]> = {
  id: ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"],
  en: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
};

/** Sapaan & tanggal menurut jam kantor (Asia/Jakarta), dalam bahasa pengguna. */
function greeting(t: Translator, locale: Locale) {
  const now = new Date();
  const hour = (now.getUTCHours() + 7) % 24;
  const salam = t(hour < 11 ? "dashboard.morning" : hour < 15 ? "dashboard.noon" : hour < 18 ? "dashboard.afternoon" : "dashboard.evening");
  const tanggal = new Intl.DateTimeFormat(INTL_TAG[locale], { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(now);
  return { salam, tanggal };
}

interface PageProps {
  searchParams: { denied?: string; password?: string };
}

export default async function DashboardPage(props: Async<PageProps>) {
  const { searchParams } = await unwrapProps(props);
  // Dashboard terbuka untuk semua user login, tapi isinya mengikuti izin:
  // ringkasan job hanya untuk pemilik view_jobs, hitungan kunjungan hanya
  // untuk pemilik view_visits (semua role bawaan punya keduanya; ini menjaga
  // konsistensi kalau nanti ada role kustom dengan izin lebih sempit).
  const user = await requireUser();
  const { t, locale } = await getT();
  const permissions = await getUserPermissions(user.id);
  const canViewJobs = permissions.has(PERMISSIONS.VIEW_JOBS);
  const canCreateJobs = permissions.has(PERMISSIONS.CREATE_JOBS);
  const complianceAlerts = permissions.has(PERMISSIONS.EDIT_REPERTORIUM) ? await getComplianceAlerts() : [];
  const accessDenied = searchParams.denied === "1";

  // Setiap blok query hanya dijalankan kalau izinnya ada; tanpa izin -> null,
  // tidak ada query ke tabel tersebut sama sekali.
  const [jobStats, recentJobs, upcoming, statusSlices] = await Promise.all([
    canViewJobs ? getJobStats(user.id) : Promise.resolve(null),
    canViewJobs ? getRecentJobs() : Promise.resolve([]),
    canViewJobs ? getUpcomingTasks() : Promise.resolve([]),
    canViewJobs ? getStatusBreakdown(t) : Promise.resolve([])
  ]);
  const { salam, tanggal } = greeting(t, locale);
  const firstName = (user.name ?? "").trim().split(/\s+/)[0] || "";

  const cards = [
    ...(jobStats
      ? [
          { label: t("dashboard.totalJobs"), value: jobStats.totalJobs, hint: t("dashboard.totalJobsHint"), dot: "bg-[#98A2B3]", href: "/jobs" },
          { label: t("dashboard.inProgress"), value: jobStats.inProgress, hint: t("dashboard.inProgressHint"), dot: "bg-[#2E90FA]", href: "/jobs?status=IN_PROGRESS" },
          { label: t("dashboard.dueToday"), value: jobStats.dueToday, hint: t("dashboard.dueTodayHint"), dot: "bg-[#F79009]", href: "/deadlines" },
          { label: t("dashboard.overdue"), value: jobStats.overdue, hint: t("dashboard.overdueHint"), dot: "bg-[#F04438]", href: "/deadlines" },
          { label: t("dashboard.completed"), value: jobStats.completed, hint: t("dashboard.completedHint"), dot: "bg-[#12B76A]", href: "/jobs?status=COMPLETED" },
          // Notaris: antrean persetujuan; staf: pekerjaan yang menjadi tanggungannya.
          canCreateJobs
            ? { label: t("dashboard.waitingReview"), value: jobStats.waitingReview, hint: t("dashboard.waitingReviewHint"), dot: "bg-[#7A5AF8]", href: "/jobs?status=REVIEW" }
            : { label: t("dashboard.myJobs"), value: jobStats.myOpen, hint: t("dashboard.myJobsHint"), dot: "bg-[#7A5AF8]", href: "/jobs?mine=1" }
        ]
      : [])
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{tanggal}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-[28px]">
            {salam}{firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        {canCreateJobs && (
          <Link
            href="/clients/new"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            {t("dashboard.newClientJob")}
          </Link>
        )}
      </div>

      {searchParams.password === "changed" && (
        <div className="rounded-lg border border-success-border bg-primary-soft px-4 py-3 text-sm font-medium text-status-on-track">
          {t("dashboard.passwordChanged")}
        </div>
      )}

      {complianceAlerts.length > 0 && (
        <Link
          href="/compliance"
          className="flex items-start gap-3 rounded-lg border border-warn-border bg-warn-soft px-4 py-3 text-sm text-warn-strong hover:opacity-90"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-due-today" />
          <div className="min-w-0 flex-1 space-y-0.5">
            {complianceAlerts.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
          <span className="shrink-0 font-bold text-status-due-today">{t("common.open")}</span>
        </Link>
      )}

      {accessDenied && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-foreground">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-status-overdue" />
          <p>{t("dashboard.accessDenied")}</p>
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {cards.map((c, i) => (
            <Link
              key={c.label}
              href={c.href}
              style={{ ["--d" as string]: `${i * 60}ms` }}
              className="surface press rise flex flex-col gap-2.5 p-4 transition-shadow hover:shadow-md"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-fg-3">{c.label}</span>
                <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
              </span>
              <span className="text-3xl font-extrabold leading-none tracking-tight text-foreground">
                <CountUp value={c.value} delay={i * 60} />
              </span>
              <span className="text-xs text-muted-foreground">{c.hint}</span>
            </Link>
          ))}
        </div>
      )}

      {canViewJobs && (
        <div className="flex flex-wrap items-start gap-5">
          <section className="surface min-w-0 flex-[999_1_520px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-bold text-foreground">{t("dashboard.recentJobs")}</h2>
              <Link href="/jobs" className="text-sm font-semibold text-primary hover:underline">
                {t("dashboard.seeAll")}
              </Link>
            </div>
            {recentJobs.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title={t("dashboard.noJobs")}
                  actionLabel={canCreateJobs ? t("dashboard.addClientJob") : undefined}
                  actionHref={canCreateJobs ? "/clients/new" : undefined}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-stack w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.04em] text-muted-foreground">
                      <th className="px-5 py-3 font-bold">{t("dashboard.colJob")}</th>
                      <th className="px-3 py-3 font-bold">{t("dashboard.colClient")}</th>
                      <th className="px-3 py-3 font-bold">{t("dashboard.colStatus")}</th>
                      <th className="px-5 py-3 font-bold">{t("dashboard.colTarget")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((job) => (
                      <tr key={job.id} className="border-t border-muted hover:bg-canvas">
                        <td data-label={t("dashboard.colJob")} className="px-5 py-3.5">
                          <Link href={`/jobs/${job.id}`} className="font-semibold text-foreground hover:text-primary">
                            {job.serviceType?.name ?? job.description ?? job.jobNumber}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {job.jobNumber} · PIC {job.pic?.name ?? "-"}
                          </p>
                        </td>
                        <td data-label={t("dashboard.colClient")} className="px-3 py-3.5 text-fg-2">{job.client.fullName}</td>
                        <td data-label={t("dashboard.colStatus")} className="px-3 py-3.5">
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-fg-2">
                            {formatStatusLabel(job.status)}
                          </span>
                        </td>
                        <td data-label={t("dashboard.colTarget")} className="whitespace-nowrap px-5 py-3.5">
                          {job.deadline ? (
                            <StatusBadge tone={classifyDeadline(job.deadline, job.status)} label={formatDate(job.deadline)} />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <section className="surface p-5">
            <h2 className="mb-4 text-base font-bold text-foreground">{t("dashboard.byStatus")}</h2>
            <DonutChart slices={statusSlices} centerLabel={t("dashboard.donutCenter")} />
          </section>

          <section className="surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">{t("dashboard.upcoming")}</h2>
              <Link href="/deadlines" className="text-sm font-semibold text-primary hover:underline">
                {t("dashboard.all")}
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noUpcoming")}</p>
            ) : (
              <ul className="space-y-4">
                {upcoming.map((task) => {
                  const d = task.dueDate!;
                  const tone = classifyDeadline(d, "IN_PROGRESS");
                  return (
                    <li key={task.id}>
                      <Link href={`/jobs/${task.job.id}`} className="flex items-start gap-3 hover:opacity-90">
                        <span className={`w-12 shrink-0 rounded-md py-1.5 text-center ${DEADLINE_TONE[tone]}`}>
                          <span className="block text-lg font-extrabold leading-tight">{d.getUTCDate()}</span>
                          <span className="block text-[11px] font-bold">{MONTH_SHORT[locale][d.getUTCMonth()]}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{task.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {task.job.jobNumber} · {task.assignee?.name ?? t("dashboard.unassigned")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          </div>
        </div>
      )}
    </div>
  );
}
