import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { formatDate, formatStatusLabel } from "@/lib/format";
import { updateDeedStatus, archiveDeed, restoreDeed, createDeedCorrection, markDeedCorrectionDelivered } from "@/app/(dashboard)/archive/actions";
import { unwrapProps, type Async } from "@/lib/pageProps";

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

export default async function DeedDetailPage(props: Async<{ params: { id: string }; searchParams?: { pembetulan?: string } }>) {
  const { params, searchParams } = await unwrapProps(props);
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
      corrections: { orderBy: { baDate: "desc" } },
      repertorium: true
    }
  });

  if (!deed) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Akta</p>
          <h1 className="break-words text-2xl font-extrabold tracking-tight text-foreground">{deed.deedNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {deed.deedType} · {formatDate(deed.deedDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            <h2 className="mb-3 text-base font-bold text-foreground">Informasi Akta</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 break-words text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Klien</dt>
                <dd>
                  <Link href={`/clients/${deed.client.id}`} className="text-primary hover:underline">
                    {deed.client.fullName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pekerjaan</dt>
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
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-foreground">Repertorium</h2>
              {canEdit && !deed.repertorium && (
                <Link href={`/notary-record/new?deedId=${deed.id}`} className="text-xs font-medium text-primary hover:underline">
                  + Catat Repertorium
                </Link>
              )}
            </div>
            {deed.repertorium ? (
              <div className="flex items-center justify-between gap-3 py-1 text-sm">
                <Link href={`/notary-record/${deed.repertorium.id}`} className="min-w-0 break-words text-foreground hover:underline">
                  {deed.repertorium.year}/{String(deed.repertorium.sequenceNumber).padStart(4, "0")} — {deed.repertorium.appearerName}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(deed.repertorium.deedDate)}</span>
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
              <div key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
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
              <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
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
              <div key={g.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
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
              <div key={k.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <Link href={`/archive/kutipan/${k.id}`} className="text-foreground hover:underline">
                  Kutipan · {formatStatusLabel(k.status)}
                </Link>
                <FileLink documentId={k.documentId} />
              </div>
            ))}
          </ArchiveSection>

          {/* Berita Acara Pembetulan (Pasal 51 UUJN) */}
          <Card>
            <div id="pembetulan" className="scroll-mt-24">
              <h2 className="text-base font-bold text-foreground">Berita Acara Pembetulan ({deed.corrections.length})</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Akta yang sudah disahkan tidak diubah. Salah tulis/ketik pada minuta dibetulkan dengan akta Berita Acara Pembetulan; catat nomor
                dan tanggalnya di sini, beri catatan pada minuta asli, lalu sampaikan salinannya kepada para pihak.
              </p>
              {searchParams?.pembetulan === "ok" && <p className="mt-2 text-xs text-status-on-track">Pembetulan dicatat.</p>}
              {searchParams?.pembetulan === "invalid" && (
                <p role="alert" className="mt-2 text-xs text-status-overdue">
                  Isi nomor, tanggal, dan uraian pembetulan (minimal 10 huruf).
                </p>
              )}
              {searchParams?.pembetulan === "tanggal" && (
                <p role="alert" className="mt-2 text-xs text-status-overdue">
                  Tanggal berita acara tidak boleh sebelum tanggal akta.
                </p>
              )}
              <div className="mt-2 divide-y divide-border">
                {deed.corrections.map((c) => (
                  <div key={c.id} className="space-y-1 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        BA Nomor {c.baNumber} · {formatDate(c.baDate)}
                      </span>
                      {c.deliveredAt ? (
                        <span className="text-xs text-status-on-track">Salinan disampaikan {formatDate(c.deliveredAt)}</span>
                      ) : canEdit ? (
                        <form action={markDeedCorrectionDelivered.bind(null, c.id)}>
                          <button type="submit" className="text-xs font-medium text-primary hover:underline">
                            Tandai salinan sudah disampaikan
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-status-due-soon">Salinan belum disampaikan</span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-foreground">{c.description}</p>
                  </div>
                ))}
                {deed.corrections.length === 0 && <p className="py-2.5 text-sm text-muted-foreground">Belum ada pembetulan.</p>}
              </div>
              {canEdit && (
                <form action={createDeedCorrection.bind(null, deed.id)} className="mt-3 space-y-2 border-t border-border pt-3">
                  <div className="flex flex-wrap gap-2">
                    <label className="w-40">
                      <span className="mb-1 block text-xs text-muted-foreground">Nomor akta BA</span>
                      <input name="baNumber" required maxLength={60} placeholder="mis. 15" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </label>
                    <label className="w-44">
                      <span className="mb-1 block text-xs text-muted-foreground">Tanggal BA</span>
                      <input name="baDate" type="date" required className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground">Yang dibetulkan</span>
                    <textarea
                      name="description"
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={3}
                      placeholder="mis. Halaman 2 baris 7: semula tertulis “1980”, seharusnya “1981”."
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <button type="submit" className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                    Catat pembetulan
                  </button>
                </form>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-base font-bold text-foreground">Ubah Status Akta</h2>
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
                  Simpan Status
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Anda tidak punya akses mengubah status akta.</p>
            )}
          </Card>

          {canEdit && (
            <Card>
              <h2 className="mb-2 text-base font-bold text-foreground">Arsip</h2>
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">
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
