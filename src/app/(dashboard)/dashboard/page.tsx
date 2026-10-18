import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatStatusLabel, getJakartaToday } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getUserPermissions, PERMISSIONS } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";

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
async function getJobStats() {
  const { startOfToday, startOfTomorrow } = getTodayRange();

  const [totalJobs, inProgress, dueToday, overdue, completed] = await Promise.all([
    prisma.job.count({ where: { recordStatus: "ACTIVE" } }),
    prisma.job.count({ where: { status: "IN_PROGRESS" } }),
    prisma.job.count({
      where: { deadline: { gte: startOfToday, lt: startOfTomorrow }, status: { notIn: ["COMPLETED", "CANCELLED"] } }
    }),
    prisma.job.count({
      where: { deadline: { lt: startOfToday }, status: { notIn: ["COMPLETED", "CANCELLED"] } }
    }),
    prisma.job.count({ where: { status: "COMPLETED" } })
  ]);

  return { totalJobs, inProgress, dueToday, overdue, completed };
}

// Statistik kunjungan -- HANYA dipanggil kalau user punya view_visits.
async function getVisitStats() {
  const { startOfToday, startOfTomorrow } = getTodayRange();
  const todayVisits = await prisma.visit.count({
    where: { visitDate: { gte: startOfToday, lt: startOfTomorrow } }
  });
  return { todayVisits };
}

async function getRecentJobs() {
  return prisma.job.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { client: true, pic: true }
  });
}

interface PageProps {
  searchParams: { denied?: string };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  // Dashboard terbuka untuk semua user login, tapi isinya mengikuti izin:
  // ringkasan job hanya untuk pemilik view_jobs, hitungan kunjungan hanya
  // untuk pemilik view_visits (semua role bawaan punya keduanya; ini menjaga
  // konsistensi kalau nanti ada role kustom dengan izin lebih sempit).
  const user = await requireUser();
  const permissions = await getUserPermissions(user.id);
  const canViewJobs = permissions.has(PERMISSIONS.VIEW_JOBS);
  const canViewVisits = permissions.has(PERMISSIONS.VIEW_VISITS);
  const canCreateJobs = permissions.has(PERMISSIONS.CREATE_JOBS);
  const accessDenied = searchParams.denied === "1";

  // Setiap blok query hanya dijalankan kalau izinnya ada; tanpa izin -> null,
  // tidak ada query ke tabel tersebut sama sekali.
  const [jobStats, visitStats, recentJobs] = await Promise.all([
    canViewJobs ? getJobStats() : Promise.resolve(null),
    canViewVisits ? getVisitStats() : Promise.resolve(null),
    canViewJobs ? getRecentJobs() : Promise.resolve([])
  ]);

  const cards = [
    ...(jobStats
      ? [
          { label: "Total Job", value: jobStats.totalJobs },
          { label: "In Progress", value: jobStats.inProgress },
          { label: "Due Today", value: jobStats.dueToday },
          { label: "Overdue", value: jobStats.overdue },
          { label: "Completed", value: jobStats.completed }
        ]
      : []),
    ...(visitStats ? [{ label: "Klien Datang Hari Ini", value: visitStats.todayVisits }] : [])
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan operasional kantor hari ini</p>
      </div>

      {accessDenied && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2 text-sm text-foreground"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-overdue" />
          <p>
            Anda tidak memiliki akses ke halaman yang diminta, sehingga dialihkan ke Dashboard. Hubungi
            Notaris/Admin jika Anda merasa seharusnya memiliki akses tersebut.
          </p>
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => (
            <Card key={c.label} className="text-center">
              <p className="text-2xl font-semibold text-foreground">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
            </Card>
          ))}
        </div>
      )}

      {canViewJobs && (
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Pekerjaan Terbaru</h2>
          <Link href="/jobs" className="text-xs font-medium text-primary hover:underline">
            Lihat semua
          </Link>
        </div>
        {recentJobs.length === 0 ? (
          <EmptyState
            title="Belum ada pekerjaan."
            actionLabel={canCreateJobs ? "Buat Job Baru" : undefined}
            actionHref={canCreateJobs ? "/jobs/new" : undefined}
          />
        ) : (
          <div className="divide-y divide-border">
            {recentJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between py-3 text-sm hover:bg-muted/50">
                <div>
                  <p className="font-medium text-foreground">{job.jobNumber} — {job.client.fullName}</p>
                  <p className="text-xs text-muted-foreground">{job.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={classifyDeadline(job.deadline, job.status)} label={formatStatusLabel(job.status)} />
                  <span className="text-xs text-muted-foreground">PIC: {job.pic?.name ?? "-"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
