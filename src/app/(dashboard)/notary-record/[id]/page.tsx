import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { updateRepertorium, archiveRepertorium, restoreRepertorium } from "@/app/(dashboard)/notary-record/actions";
import { unwrapProps, type Async } from "@/lib/pageProps";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default async function RepertoriumDetailPage(props: Async<{ params: { id: string } }>) {
  const { tp } = await getT();
  const { params } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_REPERTORIUM);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);

  const entry = await prisma.repertorium.findUnique({
    where: { id: params.id },
    include: { deed: { include: { minuta: true } }, client: true, job: true }
  });
  if (!entry) notFound();

  const updateAction = updateRepertorium.bind(null, entry.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{tp("Repertorium")}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {entry.year}/{String(entry.sequenceNumber).padStart(4, "0")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {entry.deedType} · {formatDate(entry.deedDate)}
          </p>
        </div>
        {entry.recordStatus === "ARCHIVED" && (
          <span className="rounded-full bg-status-archived/10 px-2.5 py-0.5 text-xs font-medium text-status-archived">
            {tp("Diarsipkan")}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={`/archive/deed/${entry.deed.id}`} className="text-primary hover:underline">
          {tp("Lihat Akta")} {entry.deed.deedNumber}
        </Link>
        {entry.client && (
          <Link href={`/clients/${entry.client.id}`} className="text-primary hover:underline">
            {tp("Lihat Klien")}
          </Link>
        )}
        {entry.job && (
          <Link href={`/jobs/${entry.job.id}`} className="text-primary hover:underline">
            {tp("Lihat Pekerjaan")}
          </Link>
        )}
        {entry.deed.minuta.length > 0 && (
          <Link href={`/archive/minuta/${entry.deed.minuta[0].id}`} className="text-primary hover:underline">
            {tp("Lihat Minuta")}
          </Link>
        )}
      </div>

      <Card>
        <h2 className="mb-3 text-base font-bold text-foreground">{tp("Metadata")}</h2>
        {canEdit ? (
          <form action={updateAction} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">{tp("Nama Penghadap")}</label>
              <input name="appearerName" required defaultValue={entry.appearerName} className={fieldClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">{tp("Keterangan")}</label>
              <textarea name="description" rows={3} defaultValue={entry.description ?? ""} className={fieldClass} />
            </div>
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              {tp("Simpan Perubahan")}
            </button>
          </form>
        ) : (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{tp("Nama Penghadap")}</dt>
              <dd className="text-foreground">{entry.appearerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{tp("Keterangan")}</dt>
              <dd className="text-foreground">{entry.description ?? "-"}</dd>
            </div>
          </dl>
        )}
      </Card>

      {canEdit && (
        <Card>
          <h2 className="mb-2 text-base font-bold text-foreground">{tp("Arsip")}</h2>
          {entry.recordStatus === "ACTIVE" ? (
            <form action={archiveRepertorium.bind(null, entry.id)}>
              <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                {tp("Arsipkan")}
              </button>
            </form>
          ) : (
            <form action={restoreRepertorium.bind(null, entry.id)}>
              <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                {tp("Pulihkan")}
              </button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
