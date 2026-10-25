import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatDateTime } from "@/lib/format";
import { deedTemplateOptions, getDeedTemplate, variantLabels } from "@/lib/deeds/registry";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import { createDeedDraftFromList } from "@/app/(dashboard)/jobs/[id]/deeds/actions";

export const dynamic = "force-dynamic";

const selectCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";

/** Semua draft akta lintas job + pembuatan draft baru (pilih job & jenis akta). */
export default async function DeedsPage() {
  const user = await requirePermission(PERMISSIONS.VIEW_JOBS);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_JOBS);

  const [waiting, drafts, jobs] = await Promise.all([
    // Perintah notaris yang belum dibuatkan draft: job aktif tanpa draft akta, terbaru dulu.
    prisma.job.findMany({
      where: {
        recordStatus: "ACTIVE",
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        deedDrafts: { none: {} },
        // Hanya layanan yang memang menghasilkan akta dari template (mis. AJB/PPAT tidak).
        OR: [{ serviceTypeId: null }, { serviceType: { name: { in: SERVICE_CATALOG.filter((c) => c.deedKey).map((c) => c.name) } } }]
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        jobNumber: true,
        description: true,
        deadline: true,
        createdAt: true,
        client: { select: { fullName: true } },
        serviceType: { select: { name: true } },
        pic: { select: { id: true, name: true } }
      }
    }),
    prisma.deedDraft.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        templateKey: true,
        updatedAt: true,
        deed: { select: { deedNumber: true } },
        ppatDeed: { select: { deedNumber: true } },
        job: { select: { id: true, jobNumber: true, status: true, picId: true, client: { select: { fullName: true } } } }
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

  // Job yang terakhir dikembalikan Notaris untuk revisi (dan belum diajukan lagi).
  const draftJobIds = Array.from(new Set(drafts.filter((d) => d.job.status === "IN_PROGRESS").map((d) => d.job.id)));
  const lastSubmitOrRevision = draftJobIds.length
    ? await prisma.auditLog.findMany({
        where: { entityType: "Job", entityId: { in: draftJobIds }, action: "job_status_auto" },
        orderBy: { timestamp: "desc" },
        select: { entityId: true, newValue: true }
      })
    : [];
  const revised = new Set<string>();
  const seen = new Set<string>();
  for (const l of lastSubmitOrRevision) {
    if (seen.has(l.entityId)) continue;
    const v = (l.newValue ?? {}) as { status?: string; reason?: string };
    if (v.status === "IN_PROGRESS" && v.reason?.startsWith("revisi:")) revised.add(l.entityId);
    if (v.status === "IN_PROGRESS" || v.status === "REVIEW") seen.add(l.entityId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Draft Akta</h1>
        <p className="text-sm text-muted-foreground">
          Buat draft akta dari template, isi datanya, lalu unduh Minuta (garis hitam) dan Salinan (garis merah) dalam format Word.
        </p>
      </div>

      <Card className="p-0">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-foreground">Job Baru Menunggu Draft Akta ({waiting.length})</h2>
          <p className="text-xs text-muted-foreground">Perintah dari Notaris yang belum dibuatkan draft. Tugas Anda ditandai.</p>
        </div>
        {waiting.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Tidak ada pekerjaan yang menunggu draft." />
          </div>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {waiting.map((j) => {
              const suggested = SERVICE_CATALOG.find((c) => c.name === j.serviceType?.name)?.deedKey;
              const hasTemplate = suggested && templates.some((t) => t.key === suggested);
              const mine = j.pic?.id === user.id;
              return (
                <li key={j.id} className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${mine ? "bg-primary/5" : ""}`}>
                  <div className="min-w-0">
                    <Link href={`/jobs/${j.id}`} className="font-medium text-primary hover:underline">
                      {j.jobNumber} — {j.client.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {j.serviceType?.name ?? "Layanan belum dipilih"}
                      {j.description ? ` · ${j.description}` : ""} · PIC: {j.pic?.name ?? "belum ditentukan"}
                      {mine ? " (Anda)" : ""} · masuk {formatDateTime(j.createdAt)}
                      {j.deadline ? ` · target ${formatDate(j.deadline)}` : ""}
                    </p>
                  </div>
                  {canEdit &&
                    (hasTemplate ? (
                      <form action={createDeedDraftFromList}>
                        <input type="hidden" name="jobId" value={j.id} />
                        <input type="hidden" name="templateKey" value={suggested} />
                        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                          Buat Draft
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pilih jenis akta di bawah</span>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {canEdit && (
        <Card>
          <h2 className="mb-3 text-base font-bold text-foreground">Buat Draft Akta (pilih pekerjaan & jenis akta)</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada job aktif. Draft akta selalu terkait dengan satu job;
              job dibuat oleh Notaris melalui Tambah Klien.
            </p>
          ) : (
            <form action={createDeedDraftFromList} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Pekerjaan / klien</span>
                <select name="jobId" required className={selectCls} defaultValue="">
                  <option value="" disabled>
                    — Pilih pekerjaan —
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
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-foreground">Semua Draft Akta</h2>
        </div>
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
                  {(() => {
                    // Posisi draft di alur: disahkan / disetujui / diperiksa / revisi / masih draft.
                    const [label, cls] = d.deed
                      ? [`Disahkan · Akta No. ${d.deed.deedNumber}`, "bg-status-on-track/10 text-status-on-track"]
                      : d.ppatDeed
                      ? [`Disahkan · Akta PPAT No. ${d.ppatDeed.deedNumber}`, "bg-status-on-track/10 text-status-on-track"]
                      : d.job.status === "READY_FOR_SIGNING"
                        ? ["Disetujui · siap tanda tangan", "bg-status-on-track/10 text-status-on-track"]
                        : d.job.status === "REVIEW"
                          ? ["Diperiksa Notaris", "bg-primary/10 text-primary"]
                          : revised.has(d.job.id)
                            ? ["Revisi diminta", "bg-status-overdue/10 text-status-overdue"]
                            : ["Draft", "bg-status-due-soon/10 text-status-due-soon"];
                    return <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>;
                  })()}
                  {d.job.picId === user.id && <span className="ml-1 text-[11px] text-muted-foreground">(tugas Anda)</span>}
                  <p className="text-xs text-muted-foreground">
                    {d.job.jobNumber} · {d.job.client.fullName} · diperbarui {formatDateTime(d.updatedAt)}
                  </p>
                </div>
                <span className="flex flex-wrap items-center gap-3 text-xs">
                  <a href={`/api/deeds/${d.id}/minuta`} className="text-foreground hover:underline">
                    {variantLabels(getDeedTemplate(d.templateKey)).minuta}
                  </a>
                  <a href={`/api/deeds/${d.id}/salinan`} className="text-status-overdue hover:underline">
                    {variantLabels(getDeedTemplate(d.templateKey)).salinan}
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
