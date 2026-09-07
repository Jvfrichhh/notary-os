import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatDate, formatStatusLabel } from "@/lib/format";
import { updateDeedStatus, archiveDeed, restoreDeed } from "@/app/(dashboard)/archive/actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["DRAFT", "PROCESS", "DONE"] as const;

function FileLink({ documentId }: { documentId: string | null }) {
  if (!documentId) return <span className="text-xs text-muted-foreground">Belum ada file</span>;
  return (
    <a
      href={`/api/documents/${documentId}/download`}
      target="_blank"
      rel="noreferrer"
      className="text-xs font-medium text-primary hover:underline"
    >
      Buka File
    </a>
  );
}

export default async function DeedDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.VIEW_MINUTA);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_MINUTA);

  const deed = await prisma.deed.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      job: true,
      notary: true,
      minuta: { orderBy: { createdAt: "desc" } },
      salinan: { orderBy: { createdAt: "desc" } },
      grosse: { orderBy: { createdAt: "desc" } },
      kutipan: { orderBy: { createdAt: "desc" } },
      repertorium: true
    }
  });

  if (!deed) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Akta</p>
          <h1 className="text-xl font-semibold text-foreground">{deed.deedNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {deed.deedType} · {formatDate(deed.deedDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
            {formatStatusLabel(deed.status)}
          </span>
          {deed.repertorium ? (
            <span className="rounded-full bg-status-on-track/10 px-2.5 py-0.5 text-xs font-medium text-status-on-track">
              Repertorium tercatat
            </span>
          ) : (
            <span className="rounded-full bg-status-due-soon/10 px-2.5 py-0.5 text-xs font-medium text-status-due-soon">
              Belum ada Repertorium
            </span>
          )}
          {deed.recordStatus === "ARCHIVED" && (
            <span className="rounded-full bg-status-archived/10 px-2.5 py-0.5 text-xs font-medium text-status-archived">
              Diarsipkan
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Info */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Informasi Akta</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Client</dt>
                <dd>
                  <Link href={`/clients/${deed.client.id}`} className="text-primary hover:underline">
                    {deed.client.fullName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Job</dt>
                <dd>
                  {deed.job ? (
                    <Link href={`/jobs/${deed.job.id}`} className="text-primary hover:underline">
                      {deed.job.jobNumber}
                    </Link>
                  ) : (
                    <span className="text-foreground">-</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Notaris</dt>
                <dd className="text-foreground">{deed.notary?.name ?? "-"}</dd>
              </div>
            </dl>
          </Card>

          {/* Repertorium -- one-to-one dengan Akta */}
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Repertorium</h2>
              {canEdit && !deed.repertorium && (
                <Link href={`/notary-record/new?deedId=${deed.id}`} className="text-xs font-medium text-primary hover:underline">
                  + Catat Repertorium
                </Link>
              )}
            </div>
            {deed.repertorium ? (
              <div className="flex items-center justify-between py-1 text-sm">
                <Link href={`/notary-record/${deed.repertorium.id}`} className="text-foreground hover:underline">
                  {deed.repertorium.year}/{String(deed.repertorium.sequenceNumber).padStart(4, "0")} — {deed.repertorium.appearerName}
                </Link>
                <span className="text-xs text-muted-foreground">{formatDate(deed.repertorium.deedDate)}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Akta ini belum tercatat di Repertorium.</p>
            )}
          </Card>

          {/* Minuta */}
          <ArchiveSection
            title="Minuta"
            count={deed.minuta.length}
            addHref={`/archive/minuta/new?deedId=${deed.id}`}
            canEdit={canEdit}
          >
            {deed.minuta.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link href={`/archive/minuta/${m.id}`} className="text-foreground hover:underline">
                  Minuta · {formatDate(m.createdAt)}
                </Link>
                <FileLink documentId={m.documentId} />
              </div>
            ))}
          </ArchiveSection>

          {/* Salinan */}
          <ArchiveSection
            title="Salinan"
            count={deed.salinan.length}
            addHref={`/archive/salinan/new?deedId=${deed.id}`}
            canEdit={canEdit}
          >
            {deed.salinan.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link href={`/archive/salinan/${s.id}`} className="text-foreground hover:underline">
                  Salinan · {formatDate(s.createdAt)}
                </Link>
                <FileLink documentId={s.documentId} />
              </div>
            ))}
          </ArchiveSection>

          {/* Grosse */}
          <ArchiveSection
            title="Grosse"
            count={deed.grosse.length}
            addHref={`/archive/grosse/new?deedId=${deed.id}`}
            canEdit={canEdit}
          >
            {deed.grosse.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link href={`/archive/grosse/${g.id}`} className="text-foreground hover:underline">
                  Grosse · {formatStatusLabel(g.status)}
                </Link>
                <FileLink documentId={g.documentId} />
              </div>
            ))}
          </ArchiveSection>

          {/* Kutipan */}
          <ArchiveSection
            title="Kutipan"
            count={deed.kutipan.length}
            addHref={`/archive/kutipan/new?deedId=${deed.id}`}
            canEdit={canEdit}
          >
            {deed.kutipan.map((k) => (
              <div key={k.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link href={`/archive/kutipan/${k.id}`} className="text-foreground hover:underline">
                  Kutipan · {formatStatusLabel(k.status)}
                </Link>
                <FileLink documentId={k.documentId} />
              </div>
            ))}
          </ArchiveSection>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Ubah Status Akta</h2>
            {canEdit ? (
              <form action={updateDeedStatus.bind(null, deed.id)} className="space-y-2">
                <select
                  name="status"
                  defaultValue={deed.status}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {formatStatusLabel(s)}
                    </option>
                  ))}
                </select>
                <button type="submit" className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Update Status
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Anda tidak punya akses mengubah status akta.</p>
            )}
          </Card>

          {canEdit && (
            <Card>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Arsip</h2>
              {deed.recordStatus === "ACTIVE" ? (
                <form action={archiveDeed.bind(null, deed.id)}>
                  <button type="submit" className="w-full rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-muted">
                    Arsipkan Akta
                  </button>
                </form>
              ) : (
                <form action={restoreDeed.bind(null, deed.id)}>
                  <button type="submit" className="w-full rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-muted">
                    Pulihkan Akta
                  </button>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchiveSection({
  title,
  count,
  addHref,
  canEdit,
  children
}: {
  title: string;
  count: number;
  addHref: string;
  canEdit: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {title} ({count})
        </h2>
        {canEdit && (
          <Link href={addHref} className="text-xs font-medium text-primary hover:underline">
            + Tambah {title}
          </Link>
        )}
      </div>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada {title.toLowerCase()} untuk akta ini.</p>
      ) : (
        <div className="divide-y divide-border">{children}</div>
      )}
    </Card>
  );
}
