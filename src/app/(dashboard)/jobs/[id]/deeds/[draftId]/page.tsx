import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { getDeedTemplate, sectionsFor, variantLabels } from "@/lib/deeds/registry";
import { nextPpatSequence } from "@/lib/ppat";
import type { DeedData } from "@/lib/deeds/schema";
import { DeedForm } from "@/components/deeds/DeedForm";
import { deleteDeedDraft } from "@/app/(dashboard)/jobs/[id]/deeds/actions";
import { FinalizeDeedForm } from "@/components/deeds/FinalizeDeedForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { nextDeedNumber } from "@/lib/deeds/numbering";
import { draftHash, reviewState } from "@/lib/deeds/review";
import { shareDraftWithClient } from "@/app/(dashboard)/jobs/[id]/deeds/actions";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DeedDraftPage({
  params,
  searchParams
}: {
  params: { id: string; draftId: string };
  searchParams?: { shared?: string };
}) {
  const user = await requirePermission(PERMISSIONS.VIEW_JOBS);
  const canEditJobs = await userHasPermission(user.id, PERMISSIONS.EDIT_JOBS);
  const isNotary = await userHasPermission(user.id, PERMISSIONS.CREATE_JOBS);
  const canFinalize =
    (await userHasPermission(user.id, PERMISSIONS.EDIT_MINUTA)) && (await userHasPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM));

  const draft = await prisma.deedDraft.findFirst({
    where: { id: params.draftId, jobId: params.id },
    include: {
      job: {
        select: {
          id: true,
          jobNumber: true,
          status: true,
          notes: true,
          client: { select: { fullName: true, _count: { select: { accounts: { where: { isActive: true } } } } } }
        }
      },
      reviews: { orderBy: { sharedAt: "desc" }, take: 1 },
      deed: { select: { id: true, deedNumber: true, repertorium: { select: { id: true, year: true, sequenceNumber: true } } } },
      ppatDeed: { select: { id: true, deedNumber: true } }
    }
  });
  const template = draft ? getDeedTemplate(draft.templateKey) : null;
  if (!draft || !template) notFound();
  const finalized = !!draft.deed || !!draft.ppatDeed;
  const isPpat = !!template.ppat;
  const labels = variantLabels(template);
  const canEdit = canEditJobs && !finalized;
  const data = (draft.data ?? {}) as DeedData;
  // Staf bisa langsung "Simpan & Ajukan" selama pekerjaan masih dikerjakan.
  const canSubmit = canEdit && !isNotary && ["INBOX", "IN_PROGRESS", "WAITING_FOR_CLIENT", "WAITING_FOR_DOCUMENT"].includes(draft.job.status);
  // Catatan revisi terakhir dari Notaris (ditulis ke catatan job saat minta revisi).
  const revisionNote =
    draft.job.status === "IN_PROGRESS"
      ? (draft.job.notes ?? "").split("\n").filter((l) => l.includes("Revisi dari Notaris")).pop()
      : undefined;
  const latestReview = draft.reviews[0];
  const review = reviewState(latestReview, draftHash(draft.data));
  const hasPortal = draft.job.client._count.accounts > 0;
  const todayJakarta = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const suggestedNomor =
    canFinalize && !finalized ? (isPpat ? String(await nextPpatSequence(Number(todayJakarta.slice(0, 4)))) : await nextDeedNumber(todayJakarta)) : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/jobs/${draft.job.id}`} className="text-xs text-muted-foreground hover:text-foreground">
            ← {draft.job.jobNumber} · {draft.job.client.fullName}
          </Link>
          <h1 className="text-xl font-semibold text-foreground">Draft {template.title}</h1>
          <p className="text-sm text-muted-foreground">
            {isPpat
              ? "Akta PPAT: isi data lalu unduh Lembar Pertama (disimpan PPAT) dan Lembar Kedua (untuk Kantor Pertanahan). Bagian yang kosong tertulis [...] di akta."
              : "Isi data lalu unduh Minuta (garis hitam) dan Salinan (garis merah) dalam format akta kantor. Bagian yang kosong tertulis [...] di akta."}
          </p>
        </div>
        {canEdit && !finalized && (
          <form action={deleteDeedDraft.bind(null, draft.id)}>
            <ConfirmButton
              message="Hapus draft akta ini? Isian akan hilang; file Word-nya diarsipkan."
              className="rounded-md border border-border px-3 py-1.5 text-xs text-status-overdue hover:bg-status-overdue/10"
            >
              Hapus draft
            </ConfirmButton>
          </form>
        )}
      </div>

      {draft.ppatDeed && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-4 py-3 text-sm text-foreground">
          Draft ini sudah <strong>disahkan</strong> sebagai{" "}
          <Link href={`/ppat/${draft.ppatDeed.id}`} className="font-medium text-primary hover:underline">
            Akta PPAT Nomor {draft.ppatDeed.deedNumber}
          </Link>
          . Isian dikunci; Lembar Pertama & Kedua final ada di Document Vault.
        </div>
      )}

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

      {revisionNote && (
        <div role="alert" className="rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2 text-sm text-foreground">
          {revisionNote.replace(/^\[[^\]]*\]\s*/, "")}
        </div>
      )}

      {!finalized && (
      <div className="rounded-md border border-status-due-soon/40 bg-status-due-soon/10 px-3 py-2 text-xs text-foreground">
        Template ini draft otomatis. Rumusan hukumnya wajib diperiksa Notaris sebelum dipakai untuk klien; minuta memuat
        halaman catatan penyusunan yang harus dihapus sebelum dicetak.
      </div>
      )}

      {!finalized && (
        <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Pemeriksaan oleh klien</h2>
              <p className="text-sm text-foreground">
                {review === "none" && "Belum dibagikan ke klien."}
                {review === "waiting" && `Menunggu klien membaca (dibagikan ${formatDateTime(latestReview!.sharedAt)}).`}
                {review === "approved" && (
                  <span className="text-status-on-track">Klien MENYETUJUI draft ini ({formatDateTime(latestReview!.decidedAt)}).</span>
                )}
                {review === "changes" && <span className="text-status-overdue">Klien minta koreksi: {latestReview!.note}</span>}
                {review === "outdated" && "Draft diubah setelah dibagikan; bagikan ulang agar klien membaca versi terbaru."}
              </p>
              {!hasPortal && (
                <p className="text-xs text-muted-foreground">Klien belum punya akses portal; buatkan di halaman klien agar bisa membaca draft.</p>
              )}
              {searchParams?.shared && <p className="text-xs text-status-on-track">Draft dibagikan; klien sudah diberi tahu.</p>}
            </div>
            {canEditJobs && hasPortal && review !== "waiting" && review !== "approved" && (
              <form action={shareDraftWithClient.bind(null, draft.id)}>
                <button type="submit" className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                  {review === "none" ? "Bagikan ke klien untuk dibaca" : "Bagikan ulang versi terbaru"}
                </button>
              </form>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Simpan perubahan dulu sebelum membagikan. Klien hanya melihat draft tanpa halaman catatan kantor.</p>
        </div>
      )}

      <DeedForm
        draftId={draft.id}
        sections={sectionsFor(template)}
        initialData={data}
        canEdit={canEdit}
        submitJobId={canSubmit ? draft.job.id : undefined}
        labels={labels}
      />

      {canFinalize && !finalized && (
        <FinalizeDeedForm
          draftId={draft.id}
          defaultNomor={suggestedNomor}
          defaultTanggal={todayJakarta}
          ppat={isPpat}
          plannedTanggal={typeof data.tanggalAkta === "string" && data.tanggalAkta !== todayJakarta ? data.tanggalAkta : undefined}
        />
      )}
    </div>
  );
}
