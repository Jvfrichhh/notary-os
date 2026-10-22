import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { LineChart } from "@/components/charts/LineChart";
import { CountUp } from "@/components/motion/CountUp";
import { formatCurrency, getJakartaToday } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function bucketByMonth(dates: Date[]): number[] {
  const buckets = new Array(12).fill(0);
  for (const d of dates) buckets[new Date(d).getUTCMonth()]++;
  return buckets;
}

/** Bar horizontal untuk perbandingan antar kategori (jenis layanan, PIC). */
function BarList({ data }: { data: { label: string; value: number }[] }) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label} title={`${d.label}: ${d.value}`} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-[#344054]">{d.label}</span>
            <span className="shrink-0 font-bold tabular-nums text-foreground">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="bar-grow h-2 rounded-full bg-primary transition-opacity group-hover:opacity-80"
              style={{ width: `${Math.max(2, (d.value / maxValue) * 100)}%`, ["--d" as string]: `${150 + i * 70}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Delta({ now, before, year }: { now: number; before: number; year: number }) {
  if (before === 0 && now === 0) return <span className="text-xs text-muted-foreground">Belum ada data</span>;
  if (before === 0) return <span className="text-xs text-muted-foreground">Tahun {year - 1}: 0</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <span className="text-xs text-muted-foreground">
      <span className={up ? "font-bold text-status-on-track" : "font-bold text-status-overdue"}>
        {up ? "▲" : "▼"} {Math.abs(pct)}%
      </span>{" "}
      vs {year - 1}
    </span>
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
  const prevStart = new Date(Date.UTC(year - 1, 0, 1));
  const prevEnd = new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999));
  // Tahun berjalan: bulan yang belum tiba tidak digambar (bukan nol).
  const lastMonth = year === todayYear ? jakartaToday.getUTCMonth() : year > todayYear ? -1 : 11;

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
    users,
    jobsPrev,
    clientsPrev,
    deedsPrev,
    completedPrev
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
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.job.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
    prisma.client.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
    prisma.deed.count({ where: { deedDate: { gte: prevStart, lte: prevEnd } } }),
    prisma.job.count({ where: { status: "COMPLETED", completionDate: { gte: prevStart, lte: prevEnd } } })
  ]);
  const upTo = (arr: number[]) => arr.map((v, i) => (i <= lastMonth ? v : null));

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
  let invoicedPerMonth: number[] = new Array(12).fill(0);
  let receivedPerMonth: number[] = new Array(12).fill(0);
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

    const [invoices, receipts] = await Promise.all([
      prisma.payment.findMany({
        where: { recordStatus: "ACTIVE", createdAt: { gte: yearStart, lte: yearEnd } },
        select: { createdAt: true, totalAmount: true }
      }),
      prisma.paymentReceipt.findMany({
        where: { voidedAt: null, paidAt: { gte: yearStart, lte: yearEnd }, payment: { recordStatus: "ACTIVE" } },
        select: { paidAt: true, amount: true }
      })
    ]);
    invoicedPerMonth = new Array(12).fill(0);
    receivedPerMonth = new Array(12).fill(0);
    for (const p of invoices) invoicedPerMonth[p.createdAt.getUTCMonth()] += Number(p.totalAmount);
    for (const r of receipts) receivedPerMonth[r.paidAt.getUTCMonth()] += Number(r.amount);

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

  const totalJobs = jobsThisYear.length;
  const totalClients = clientsThisYear.length;
  const totalDeeds = deedsThisYear.length;
  const kpis = [
    { label: "Pekerjaan masuk", value: totalJobs, prev: jobsPrev },
    { label: "Pekerjaan selesai", value: completedCount, prev: completedPrev },
    { label: "Klien baru", value: totalClients, prev: clientsPrev },
    { label: "Akta dibuat", value: totalDeeds, prev: deedsPrev }
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Laporan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ringkasan operasional kantor sepanjang {year}.</p>
        </div>
        <nav aria-label="Pilih tahun" className="flex gap-1 rounded-md border border-border bg-background p-1 text-sm shadow-card">
          {yearOptions.map((y) => (
            <Link
              key={y}
              href={`/reports?year=${y}`}
              aria-current={y === year ? "page" : undefined}
              className={`rounded-sm px-3.5 py-1.5 font-semibold ${y === year ? "bg-primary text-primary-foreground" : "text-[#475467] hover:bg-muted"}`}
            >
              {y}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            style={{ ["--d" as string]: `${i * 60}ms` }}
            className="rise flex flex-col gap-2 rounded-xl border border-border bg-background p-4 shadow-card"
          >
            <span className="text-[13px] font-semibold text-[#475467]">{k.label}</span>
            <span className="text-3xl font-extrabold leading-none tracking-tight text-foreground"><CountUp value={k.value} delay={i * 60} /></span>
            <Delta now={k.value} before={k.prev} year={year} />
          </div>
        ))}
        <div
          style={{ ["--d" as string]: "240ms" }}
          className="rise col-span-2 flex flex-col gap-2 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 lg:col-span-1">
          <span className="text-[13px] font-semibold text-[#912018]">Terlambat saat ini</span>
          <span className="text-3xl font-extrabold leading-none tracking-tight text-status-overdue">
            <CountUp value={overdueCount} delay={240} />
          </span>
          <Link href="/deadlines" className="text-xs font-bold text-status-overdue hover:underline">
            Lihat daftar →
          </Link>
        </div>
      </div>

      <Card>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-bold text-foreground">Tren per bulan ({year})</h2>
          <p className="text-xs text-muted-foreground">Arahkan kursor ke grafik untuk melihat angka tiap bulan</p>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          {totalJobs.toLocaleString("id-ID")} pekerjaan masuk, {totalClients.toLocaleString("id-ID")} klien baru, dan{" "}
          {totalDeeds.toLocaleString("id-ID")} akta sepanjang tahun ini.
        </p>
        <LineChart
          ariaLabel={`Grafik garis pekerjaan masuk, klien baru, dan akta per bulan tahun ${year}`}
          labels={MONTH_LABELS}
          series={[
            { name: "Pekerjaan masuk", color: "#047857", values: upTo(jobsPerMonth) },
            { name: "Klien baru", color: "#EB6834", values: upTo(clientsPerMonth) },
            { name: "Akta", color: "#2A78D6", values: upTo(deedsPerMonth) }
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-bold text-foreground">Pekerjaan per jenis layanan ({year})</h2>
          {jobsByService.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data.</p>
          ) : (
            <BarList data={jobsByService} />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-bold text-foreground">Beban kerja per PIC (pekerjaan aktif)</h2>
          {workloadPic.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pekerjaan aktif.</p>
          ) : (
            <BarList data={workloadPic} />
          )}
        </Card>
      </div>

      {canViewFinance && paymentSummary && (
        <>
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <h2 className="text-base font-bold text-foreground">Keuangan per bulan ({year})</h2>
              <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Total ditagihkan</dt>
                  <dd className="text-lg font-extrabold text-foreground">{formatCurrency(paymentSummary.totalInvoiced)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Total dibayar</dt>
                  <dd className="text-lg font-extrabold text-status-on-track">{formatCurrency(paymentSummary.totalPaid)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Belum dibayar</dt>
                  <dd className="text-lg font-extrabold text-status-overdue">{formatCurrency(paymentSummary.totalOutstanding)}</dd>
                </div>
              </dl>
            </div>
            <LineChart
              ariaLabel={`Grafik garis tagihan dan pembayaran diterima per bulan tahun ${year}`}
              labels={MONTH_LABELS}
              format="rupiah"
              height={240}
              series={[
                { name: "Ditagihkan", color: "#2A78D6", values: upTo(invoicedPerMonth) },
                { name: "Diterima", color: "#047857", values: upTo(receivedPerMonth) }
              ]}
            />
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-bold text-foreground">Tagihan belum lunas terbesar</h2>
            {outstandingTop.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada tagihan yang belum lunas.</p>
            ) : (
              <div className="divide-y divide-muted text-sm">
                {outstandingTop.map((o, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{o.clientName}</p>
                      {o.jobNumber && <p className="text-xs text-muted-foreground">{o.jobNumber}</p>}
                    </div>
                    <span className="shrink-0 font-bold tabular-nums text-status-overdue">{o.remaining}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
