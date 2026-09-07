import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { classifyDeadline, formatDate, formatStatusLabel } from "@/lib/format";
import { JOB_STATUSES } from "@/lib/jobStatus";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface JobsPageProps {
  searchParams: { view?: string; q?: string; status?: string };
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const user = await requirePermission(PERMISSIONS.VIEW_JOBS);
  const canCreate = await userHasPermission(user.id, PERMISSIONS.CREATE_JOBS);

  const view = searchParams.view === "kanban" ? "kanban" : "table";
  const q = searchParams.q?.trim() ?? "";

  const jobs = await prisma.job.findMany({
    where: {
      recordStatus: "ACTIVE",
      ...(q
        ? {
            OR: [
              { jobNumber: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { client: { fullName: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: "desc" },
    include: { client: true, pic: true, serviceType: true }
  });

  const qsSuffix = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Joblist</h1>
          <p className="text-sm text-muted-foreground">Seluruh pekerjaan aktif kantor</p>
        </div>
        {canCreate && (
          <Link
            href="/jobs/new"
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Job
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="w-full sm:max-w-xs">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cari nomor job, client, deskripsi..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {view === "kanban" && <input type="hidden" name="view" value="kanban" />}
        </form>

        <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
          <Link
            href={`/jobs?view=table${qsSuffix}`}
            className={cn("rounded px-3 py-1", view === "table" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground")}
          >
            Table
          </Link>
          <Link
            href={`/jobs?view=kanban${qsSuffix}`}
            className={cn("rounded px-3 py-1", view === "kanban" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground")}
          >
            Kanban
          </Link>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <EmptyState title="Belum ada pekerjaan." actionLabel={canCreate ? "Buat Job Baru" : undefined} actionHref="/jobs/new" />
        </Card>
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {JOB_STATUSES.map((status) => {
            const columnJobs = jobs.filter((j) => j.status === status);
            return (
              <div key={status} className="w-72 flex-shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {formatStatusLabel(status)}
                  </p>
                  <span className="text-xs text-muted-foreground">{columnJobs.length}</span>
                </div>
                <div className="space-y-2">
                  {columnJobs.map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <Card className="!p-3 hover:border-primary/40">
                        <p className="text-sm font-medium text-foreground">{job.jobNumber}</p>
                        <p className="text-xs text-muted-foreground">{job.client.fullName}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <StatusBadge tone={classifyDeadline(job.deadline, job.status)} label={formatDate(job.deadline)} />
                          <span className="text-[11px] text-muted-foreground">{job.pic?.name ?? "-"}</span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                  {columnJobs.length === 0 && (
                    <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                      Kosong
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Layanan</th>
                  <th className="px-4 py-3 font-medium">Deadline</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">PIC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`} className="font-medium text-foreground hover:underline">
                        {job.jobNumber}
                      </Link>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{job.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${job.client.id}`} className="text-foreground hover:underline">
                        {job.client.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{job.serviceType?.name ?? "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={classifyDeadline(job.deadline, job.status)} label={formatDate(job.deadline)} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatStatusLabel(job.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{job.pic?.name ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
