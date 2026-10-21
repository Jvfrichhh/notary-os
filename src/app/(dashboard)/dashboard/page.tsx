import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatDate, formatStatusLabel, getJakartaToday } from "@/lib/format";
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
    include: { client: true, pic: true }
  });
}

interface PageProps {
  searchParams: { denied?: string; password?: string };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  // Dashboard terbuka untuk semua user login, tapi isinya mengikuti izin:
  // ringkasan job hanya untuk pemilik view_jobs, hitungan kunjungan hanya
  // untuk pemilik view_visits (semua role bawaan punya keduanya; ini menjaga
  // konsistensi kalau nanti ada role kustom dengan izin lebih sempit).
  const user = await requireUser();
  const permissions = await getUserPermissions(user.id);
  const canViewJobs = permissions.has(PERMISSIONS.VIEW_JOBS);
  const canCreateJobs = permissions.has(PERMISSIONS.CREATE_JOBS);
  const accessDenied = searchParams.denied === "1";

  // Setiap blok query hanya dijalankan kalau izinnya ada; tanpa izin -> null,
  // tidak ada query ke tabel tersebut sama sekali.
  const [jobStats, recentJobs] = await Promise.all([
    canViewJobs ? getJobStats(user.id) : Promise.resolve(null),
    canViewJobs ? getRecentJobs() : Promise.resolve([])
  ]);

  const cards = [
    ...(jobStats
      ? [
          { label: "Total Pekerjaan", value: jobStats.totalJobs },
          { label: "Sedang Diproses", value: jobStats.inProgress },
          { label: "Tenggat Hari Ini", value: jobStats.dueToday },
          { label: "Terlambat", value: jobStats.overdue },
          { label: "Selesai", value: jobStats.completed },
          // Notaris: antrean persetujuan; staf: pekerjaan yang menjadi tanggungannya.
          canCreateJobs
            ? { label: "Menunggu Persetujuan", value: jobStats.waitingReview, href: "/jobs?status=REVIEW" }
            : { label: "Job Saya", value: jobStats.myOpen, href: "/jobs?mine=1" }
        ]
      : [])
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan operasional kantor hari ini</p>
      </div>

      {searchParams.password === "changed" && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm text-foreground">
          Password berhasil diganti.
        </div>
      )}

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
          {cards.map((c) => {
            const body = (
              <Card className="text-center">
                <p className="text-2xl font-semibold text-foreground">{c.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
              </Card>
            );
            return "href" in c && c.href ? (
              <Link key={c.label} href={c.href} className="block hover:opacity-90">
                {body}
              </Link>
            ) : (
              <div key={c.label}>{body}</div>
            );
          })}
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
            actionLabel={canCreateJobs ? "Tambah Klien & Pekerjaan" : undefined}
            actionHref={canCreateJobs ? "/clients/new" : undefined}
          />
        ) : (
          <div className="divide-y divide-border">
            {recentJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm hover:bg-muted/50">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{job.jobNumber} — {job.client.fullName}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{job.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{formatStatusLabel(job.status)}</span>
                  {job.deadline && <StatusBadge tone={classifyDeadline(job.deadline, job.status)} label={`Target ${formatDate(job.deadline)}`} />}
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
