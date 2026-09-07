import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatStatusLabel, getJakartaToday } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  // "Hari ini" versi kantor (Asia/Jakarta), bukan timezone server -- konsisten
  // dengan classifyDeadline yang dipakai di Deadlines/Calendar/Joblist.
  const startOfToday = getJakartaToday();
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [totalJobs, inProgress, dueToday, overdue, completed, todayVisits] = await Promise.all([
    prisma.job.count({ where: { recordStatus: "ACTIVE" } }),
    prisma.job.count({ where: { status: "IN_PROGRESS" } }),
    prisma.job.count({
      where: { deadline: { gte: startOfToday, lt: startOfTomorrow }, status: { notIn: ["COMPLETED", "CANCELLED"] } }
    }),
    prisma.job.count({
      where: { deadline: { lt: startOfToday }, status: { notIn: ["COMPLETED", "CANCELLED"] } }
    }),
    prisma.job.count({ where: { status: "COMPLETED" } }),
    prisma.visit.count({ where: { visitDate: { gte: startOfToday, lt: startOfTomorrow } } })
  ]);

  return { totalJobs, inProgress, dueToday, overdue, completed, todayVisits };
}

async function getRecentJobs() {
  return prisma.job.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { client: true, pic: true }
  });
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const recentJobs = await getRecentJobs();

  const cards = [
    { label: "Total Job", value: stats.totalJobs },
    { label: "In Progress", value: stats.inProgress },
    { label: "Due Today", value: stats.dueToday },
    { label: "Overdue", value: stats.overdue },
    { label: "Completed", value: stats.completed },
    { label: "Klien Datang Hari Ini", value: stats.todayVisits }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan operasional kantor hari ini</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="text-center">
            <p className="text-2xl font-semibold text-foreground">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Pekerjaan Terbaru</h2>
          <Link href="/jobs" className="text-xs font-medium text-primary hover:underline">
            Lihat semua
          </Link>
        </div>
        {recentJobs.length === 0 ? (
          <EmptyState title="Belum ada pekerjaan." actionLabel="Buat Job Baru" actionHref="/jobs/new" />
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
    </div>
  );
}
