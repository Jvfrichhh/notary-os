import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { deedTemplateOptions } from "@/lib/deeds/registry";
import { createDeedDraftFromList } from "@/app/(dashboard)/jobs/[id]/deeds/actions";

export const dynamic = "force-dynamic";

const selectCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";

/** Semua draft akta lintas job + pembuatan draft baru (pilih job & jenis akta). */
export default async function DeedsPage() {
  const user = await requirePermission(PERMISSIONS.VIEW_JOBS);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_JOBS);

  const [drafts, jobs] = await Promise.all([
    prisma.deedDraft.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        templateKey: true,
        updatedAt: true,
        job: { select: { id: true, jobNumber: true, client: { select: { fullName: true } } } }
      }
    }),
    canEdit
      ? prisma.job.findMany({
          where: { recordStatus: "ACTIVE", status: { notIn: ["COMPLETED", "CANCELLED"] } },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, jobNumber: true, client: { select: { fullName: true } }, serviceType: { select: { name: true } } }
        })
      : Promise.resolve([])
  ]);
  const templates = deedTemplateOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Draft Akta</h1>
        <p className="text-sm text-muted-foreground">
          Buat draft akta dari template, isi datanya, lalu unduh Minuta (garis hitam) dan Salinan (garis merah) dalam format Word.
        </p>
      </div>

      {canEdit && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Buat Draft Akta Baru</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada job aktif. Draft akta selalu terkait dengan satu job;{" "}
              <Link href="/clients/new" className="text-primary hover:underline">
                tambah klien sekaligus job
              </Link>{" "}
              terlebih dahulu.
            </p>
          ) : (
            <form action={createDeedDraftFromList} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Job / klien</span>
                <select name="jobId" required className={selectCls} defaultValue="">
                  <option value="" disabled>
                    — Pilih job —
                  </option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.jobNumber} — {j.client.fullName}
                      {j.serviceType ? ` (${j.serviceType.name})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Jenis akta</span>
                <select name="templateKey" required className={selectCls}>
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Buat Draft
              </button>
            </form>
          )}
        </Card>
      )}

      <Card className="p-0">
        {drafts.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Belum ada draft akta." />
          </div>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {drafts.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/jobs/${d.job.id}/deeds/${d.id}`} className="font-medium text-primary hover:underline">
                    {d.title ?? d.templateKey}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {d.job.jobNumber} · {d.job.client.fullName} · diperbarui {formatDateTime(d.updatedAt)}
                  </p>
                </div>
                <span className="flex items-center gap-3 text-xs">
                  <a href={`/api/deeds/${d.id}/minuta`} className="text-foreground hover:underline">
                    Minuta
                  </a>
                  <a href={`/api/deeds/${d.id}/salinan`} className="text-status-overdue hover:underline">
                    Salinan
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
