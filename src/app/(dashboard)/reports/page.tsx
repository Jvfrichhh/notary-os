import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatCurrency, getJakartaToday } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function bucketByMonth(dates: Date[]): number[] {
  const buckets = new Array(12).fill(0);
  for (const d of dates) buckets[new Date(d).getUTCMonth()]++;
  return buckets;
}

function BarList({ data, max }: { data: { label: string; value: number }[]; max?: number }) {
  const maxValue = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 text-muted-foreground">{d.label}</span>
          <div className="h-2 flex-1 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (d.value / maxValue) * 100)}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right font-medium text-foreground">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

interface PageProps {
  searchParams: { year?: string };
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const user = await requirePermission(PERMISSIONS.VIEW_JOBS);
  const canViewFinance = await userHasPermission(user.id, PERMISSIONS.VIEW_FINANCE);

  const jakartaToday = getJakartaToday();
  const todayYear = jakartaToday.getUTCFullYear();
  const year = Number(searchParams.year) || todayYear;
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  const yearOptions = Array.from({ length: 5 }, (_, i) => todayYear - i);

  // Semua query di bawah cuma select kolom minimal yang dibutuhkan (bukan
  // seluruh row) supaya ringan -- lalu di-bucket per bulan di JS, dihindari
  // raw SQL date_trunc supaya tetap portable & gampang dibaca.
  const [
    jobsThisYear,
    jobsByServiceRaw,
    completedCount,
    overdueCount,
    activeJobsForWorkload,
    clientsThisYear,
    deedsThisYear,
    serviceTypes,
    users
  ] = await Promise.all([
    prisma.job.findMany({ where: { createdAt: { gte: yearStart, lte: yearEnd } }, select: { createdAt: true } }),
    prisma.job.groupBy({ by: ["serviceTypeId"], _count: { _all: true }, where: { createdAt: { gte: yearStart, lte: yearEnd } } }),
    prisma.job.count({ where: { status: "COMPLETED", completionDate: { gte: yearStart, lte: yearEnd } } }),
    // "Overdue" = deadline sebelum hari ini (Jakarta) -- samakan definisinya
    // dengan classifyDeadline yang dipakai di Dashboard/Deadlines/Calendar/Joblist,
    // bukan "lewat dari detik ini" yang bisa nandain job due HARI INI sebagai overdue.
    prisma.job.count({
      where: { recordStatus: "ACTIVE", status: { notIn: ["COMPLETED", "CANCELLED"] }, deadline: { lt: jakartaToday } }
    }),
    prisma.job.groupBy({
      by: ["picId"],
      _count: { _all: true },
      where: { recordStatus: "ACTIVE", status: { notIn: ["COMPLETED", "CANCELLED"] } }
    }),
    prisma.client.findMany({ where: { createdAt: { gte: yearStart, lte: yearEnd } }, select: { createdAt: true } }),
    prisma.deed.findMany({ where: { deedDate: { gte: yearStart, lte: yearEnd } }, select: { deedDate: true } }),
    prisma.serviceType.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, name: true } })
  ]);

  const serviceTypeName = new Map(serviceTypes.map((s) => [s.id, s.name]));
  const userName = new Map(users.map((u) => [u.id, u.name]));

  const jobsPerMonth = bucketByMonth(jobsThisYear.map((j) => j.createdAt));
  const clientsPerMonth = bucketByMonth(clientsThisYear.map((c) => c.createdAt));
  const deedsPerMonth = bucketByMonth(deedsThisYear.map((d) => d.deedDate));

  const jobsByService = jobsByServiceRaw
    .map((g) => ({ label: g.serviceTypeId ? serviceTypeName.get(g.serviceTypeId) ?? "Lainnya" : "Tanpa Jenis", value: g._count._all }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const workloadPic = activeJobsForWorkload
    .map((g) => ({ label: g.picId ? userName.get(g.picId) ?? "?" : "Belum Ditugaskan", value: g._count._all }))
    .sort((a, b) => b.value - a.value);

  let paymentSummary: { totalInvoiced: number; totalPaid: number; totalOutstanding: number } | null = null;
  let outstandingTop: { clientName: string; jobNumber: string | null; remaining: string }[] = [];

  if (canViewFinance) {
    const agg = await prisma.payment.aggregate({
      where: { recordStatus: "ACTIVE", createdAt: { gte: yearStart, lte: yearEnd } },
      _sum: { totalAmount: true, paidAmount: true, remainingAmount: true }
    });
    paymentSummary = {
      totalInvoiced: Number(agg._sum.totalAmount ?? 0),
      totalPaid: Number(agg._sum.paidAmount ?? 0),
      totalOutstanding: Number(agg._sum.remainingAmount ?? 0)
    };

    const topOutstanding = await prisma.payment.findMany({
      where: { recordStatus: "ACTIVE", status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      include: { client: true, job: true },
      orderBy: { remainingAmount: "desc" },
      take: 10
    });
    outstandingTop = topOutstanding.map((p) => ({
      clientName: p.client.fullName,
      jobNumber: p.job?.jobNumber ?? null,
      remaining: formatCurrency(p.remainingAmount)
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Ringkasan operasional kantor.</p>
        </div>
        <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
          {yearOptions.map((y) => (
            <Link
              key={y}
              href={`/reports?year=${y}`}
              className={`rounded px-3 py-1 ${y === year ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Jobs per Bulan ({year})</h2>
          <BarList data={MONTH_LABELS.map((label, i) => ({ label, value: jobsPerMonth[i] }))} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Jobs per Jenis Layanan ({year})</h2>
          {jobsByService.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data.</p>
          ) : (
            <BarList data={jobsByService} />
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Completed vs Overdue</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Completed ({year})</dt>
              <dd className="text-2xl font-semibold text-status-on-track">{completedCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Overdue (saat ini)</dt>
              <dd className="text-2xl font-semibold text-status-overdue">{overdueCount}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Workload per PIC (job aktif)</h2>
          {workloadPic.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada job aktif.</p>
          ) : (
            <BarList data={workloadPic} />
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Clients Baru per Bulan ({year})</h2>
          <BarList data={MONTH_LABELS.map((label, i) => ({ label, value: clientsPerMonth[i] }))} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Deeds per Bulan ({year})</h2>
          <BarList data={MONTH_LABELS.map((label, i) => ({ label, value: deedsPerMonth[i] }))} />
        </Card>

        {canViewFinance && paymentSummary && (
          <>
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Payment Summary ({year})</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Ditagihkan</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(paymentSummary.totalInvoiced)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Dibayar</dt>
                  <dd className="font-medium text-status-on-track">{formatCurrency(paymentSummary.totalPaid)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Outstanding</dt>
                  <dd className="font-medium text-status-overdue">{formatCurrency(paymentSummary.totalOutstanding)}</dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Outstanding Payment Tertinggi</h2>
              {outstandingTop.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada payment outstanding.</p>
              ) : (
                <div className="divide-y divide-border text-sm">
                  {outstandingTop.map((o, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-foreground">{o.clientName}</p>
                        {o.jobNumber && <p className="text-xs text-muted-foreground">{o.jobNumber}</p>}
                      </div>
                      <span className="font-medium text-status-overdue">{o.remaining}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
