import { NextResponse } from "next/server";
import { getPortalPrincipal } from "@/lib/portalSession";
import { prisma } from "@/lib/prisma";
import { getDeedTemplate } from "@/lib/deeds/registry";
import { renderDeed } from "@/lib/deeds/render";
import { draftHash } from "@/lib/deeds/review";
import type { DeedData } from "@/lib/deeds/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Klien mengunduh draft akta yang dibagikan kepadanya (Word, tanpa halaman
 * catatan kantor). Hanya draft pada pekerjaan miliknya, review terakhir, dan
 * isi yang masih sama dengan saat dibagikan.
 */
export async function GET(_req: Request, { params }: { params: { reviewId: string } }) {
  const portal = await getPortalPrincipal();
  if (!portal.ok) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: portal.reason === "unauthenticated" ? 401 : 403 });
  }
  if (portal.principal.mustChangePassword) {
    return NextResponse.json({ error: "Ganti password sementara Anda terlebih dahulu." }, { status: 403 });
  }
  const review = await prisma.deedDraftReview.findFirst({
    where: { id: params.reviewId, draft: { job: { clientId: portal.principal.clientId, recordStatus: "ACTIVE" } } },
    select: { id: true, dataHash: true, draftId: true, draft: { select: { templateKey: true, data: true, job: { select: { jobNumber: true } } } } }
  });
  const template = review ? getDeedTemplate(review.draft.templateKey) : null;
  if (!review || !template) return NextResponse.json({ error: "Draft tidak ditemukan." }, { status: 404 });
  const latest = await prisma.deedDraftReview.findFirst({ where: { draftId: review.draftId }, orderBy: { sharedAt: "desc" }, select: { id: true } });
  if (latest?.id !== review.id || draftHash(review.draft.data) !== review.dataHash) {
    return NextResponse.json({ error: "Draft sedang diperbarui kantor; tunggu versi terbaru dibagikan." }, { status: 409 });
  }
  const { buffer } = renderDeed(template, (review.draft.data ?? {}) as DeedData, "minuta", { notes: false });
  const fileName = `Draft_${template.title.replace(/[^A-Za-z0-9]+/g, "_")}_${review.draft.job.jobNumber}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store"
    }
  });
}
