import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { getDeedTemplate, sectionsFor } from "@/lib/deeds/registry";
import type { DeedData } from "@/lib/deeds/schema";
import { DeedForm } from "@/components/deeds/DeedForm";
import { deleteDeedDraft } from "@/app/(dashboard)/jobs/[id]/deeds/actions";
import { FinalizeDeedForm } from "@/components/deeds/FinalizeDeedForm";

export const dynamic = "force-dynamic";

export default async function DeedDraftPage({ params }: { params: { id: string; draftId: string } }) {
  const user = await requirePermission(PERMISSIONS.VIEW_JOBS);
  const canEditJobs = await userHasPermission(user.id, PERMISSIONS.EDIT_JOBS);
  const canFinalize =
    (await userHasPermission(user.id, PERMISSIONS.EDIT_MINUTA)) && (await userHasPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM));

  const draft = await prisma.deedDraft.findFirst({
    where: { id: params.draftId, jobId: params.id },
    include: {
      job: { select: { id: true, jobNumber: true, client: { select: { fullName: true } } } },
      deed: { select: { id: true, deedNumber: true, repertorium: { select: { id: true, year: true, sequenceNumber: true } } } }
    }
  });
  const template = draft ? getDeedTemplate(draft.templateKey) : null;
  if (!draft || !template) notFound();
  const finalized = !!draft.deed;
  const canEdit = canEditJobs && !finalized;
  const data = (draft.data ?? {}) as DeedData;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/jobs/${draft.job.id}`} className="text-xs text-muted-foreground hover:text-foreground">
            ← {draft.job.jobNumber} · {draft.job.client.fullName}
          </Link>
          <h1 className="text-xl font-semibold text-foreground">Draft {template.title}</h1>
          <p className="text-sm text-muted-foreground">
            Isi data lalu unduh Minuta (garis hitam) dan Salinan (garis merah) dalam format akta kantor. Bagian yang kosong
            tertulis [...] di akta.
          </p>
        </div>
        {canEdit && !finalized && (
          <form action={deleteDeedDraft.bind(null, draft.id)}>
            <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs text-status-overdue hover:bg-status-overdue/10">
              Hapus draft
            </button>
          </form>
        )}
      </div>

      {finalized && draft.deed && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-4 py-3 text-sm text-foreground">
          Draft ini sudah <strong>disahkan</strong> sebagai{" "}
          <Link href={`/archive/deed/${draft.deed.id}`} className="font-medium text-primary hover:underline">
            Akta Nomor {draft.deed.deedNumber}
          </Link>
          {draft.deed.repertorium && (
            <>
              {" "}
              · Repertorium{" "}
              <Link href={`/notary-record/${draft.deed.repertorium.id}`} className="font-medium text-primary hover:underline">
                {draft.deed.repertorium.year}/{String(draft.deed.repertorium.sequenceNumber).padStart(4, "0")}
              </Link>
            </>
          )}
          . Isian dikunci; file final ada di Document Vault.
        </div>
      )}

      {!finalized && (
      <div className="rounded-md border border-status-due-soon/40 bg-status-due-soon/10 px-3 py-2 text-xs text-foreground">
        Template ini draft otomatis. Rumusan hukumnya wajib diperiksa Notaris sebelum dipakai untuk klien; minuta memuat
        halaman catatan penyusunan yang harus dihapus sebelum dicetak.
      </div>
      )}

      <DeedForm draftId={draft.id} sections={sectionsFor(template)} initialData={data} canEdit={canEdit} />

      {canFinalize && !finalized && (
        <FinalizeDeedForm
          draftId={draft.id}
          defaultNomor={typeof data.nomorAkta === "string" ? data.nomorAkta : ""}
          defaultTanggal={typeof data.tanggalAkta === "string" ? data.tanggalAkta : ""}
        />
      )}
    </div>
  );
}
