import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatDate, formatStatusLabel, type DeadlineTone } from "@/lib/format";
import type { Job, Client, User } from "@prisma/client";

export const dynamic = "force-dynamic";

type JobWithRelations = Job & { client: Client; pic: User | null };

const GROUPS: { tone: DeadlineTone; title: string }[] = [
  { tone: "overdue", title: "🔴 Terlambat" },
  { tone: "due-today", title: "🟠 Hari Ini" },
  { tone: "due-soon", title: "🟡 Segera (≤ 3 hari)" },
  { tone: "on-track", title: "🟢 Mendatang" }
];

export default async function DeadlinesPage() {
  await requirePermission(PERMISSIONS.VIEW_JOBS);

  const jobs = await prisma.job.findMany({
    where: {
      recordStatus: "ACTIVE",
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      deadline: { not: null }
    },
    orderBy: { deadline: "asc" },
    include: { client: true, pic: true }
  });

  const grouped: Record<DeadlineTone, JobWithRelations[]> = {
    overdue: [],
    "due-today": [],
    "due-soon": [],
    "on-track": [],
    archived: []
  };

  for (const job of jobs) {
    const tone = classifyDeadline(job.deadline, job.status);
    grouped[tone].push(job);
  }

  const totalWithDeadline = jobs.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tenggat</h1>
        <p className="text-sm text-muted-foreground">Semua job aktif yang punya deadline, dikelompokkan berdasarkan urgensi</p>
      </div>

      {totalWithDeadline === 0 ? (
        <Card>
          <EmptyState title="Tidak ada job dengan deadline yang belum selesai." />
        </Card>
      ) : (
        <div className="space-y-6">
          {GROUPS.map((group) => {
            const items = grouped[group.tone];
            if (items.length === 0) return null;

            return (
              <div key={group.tone}>
                <h2 className="mb-2 text-sm font-semibold text-foreground">
                  {group.title} <span className="font-normal text-muted-foreground">({items.length})</span>
                </h2>
                <Card className="!p-0">
                  <div className="divide-y divide-border">
                    {items.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {job.jobNumber} — {job.client.fullName}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{job.description}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs text-muted-foreground">{formatStatusLabel(job.status)}</span>
                          <StatusBadge tone={group.tone} label={formatDate(job.deadline)} />
                          <span className="text-xs text-muted-foreground">{job.pic?.name ?? "-"}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
