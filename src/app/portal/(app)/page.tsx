import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/portalSession";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatDate } from "@/lib/format";
import { PORTAL_ACTIVE_STATUSES, PORTAL_NEEDS_CLIENT_STATUSES, portalStatusLabel } from "@/lib/portalLabels";

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage({ searchParams }: { searchParams: { password?: string } }) {
  const { clientId, client } = await requireClientAccount();

  // SEMUA query dibatasi where: { clientId } dari principal yang sudah
  // diverifikasi server -- klien tidak pernah bisa memilih clientId sendiri.
  const scope = { clientId, recordStatus: "ACTIVE" as const };

  const [activeCount, needsYouCount, completedCount, jobs] = await Promise.all([
    prisma.job.count({ where: { ...scope, status: { in: PORTAL_ACTIVE_STATUSES } } }),
    prisma.job.count({ where: { ...scope, status: { in: PORTAL_NEEDS_CLIENT_STATUSES } } }),
    prisma.job.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.job.findMany({
      where: scope,
      orderBy: [{ status: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
      take: 50,
      // select eksplisit: hanya kolom yang memang untuk klien. Kolom internal
      // (notes, priority, assistant/reviewer, dll) tidak ikut terambil.
      select: {
        id: true,
        jobNumber: true,
        description: true,
        status: true,
        deadline: true,
        createdAt: true,
        serviceType: { select: { name: true } }
      }
    })
  ]);

  const cards = [
    { label: "Pekerjaan Berjalan", value: activeCount },
    { label: "Menunggu Anda", value: needsYouCount, highlight: needsYouCount > 0 },
    { label: "Selesai", value: completedCount }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Halo, {client.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan pekerjaan Anda di kantor notaris{client.companyName ? ` · ${client.companyName}` : ""}
        </p>
      </div>

      {searchParams.password === "changed" && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm text-foreground">
          Password berhasil diganti.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {cards.map((c) => (
          <Card key={c.label} className={`!p-3 sm:!p-5 ${c.highlight ? "border-status-due-today/50" : ""}`}>
            <p className="text-xl font-semibold text-foreground sm:text-2xl">{c.value}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground sm:text-xs">{c.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Daftar Pekerjaan</h2>
        {jobs.length === 0 ? (
          <EmptyState title="Belum ada pekerjaan yang terdaftar atas nama Anda." />
        ) : (
          <div className="divide-y divide-border">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/portal/jobs/${job.id}`}
                className="-mx-2 flex flex-col gap-2 rounded-md px-2 py-3 text-sm hover:bg-muted/50 active:bg-muted sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {job.jobNumber}
                    {job.serviceType?.name ? ` — ${job.serviceType.name}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{job.description || "—"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusBadge tone={classifyDeadline(job.deadline, job.status)} label={portalStatusLabel(job.status)} />
                  <span className="text-xs text-muted-foreground">
                    {job.deadline ? `Target: ${formatDate(job.deadline)}` : "Target belum ditentukan"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
