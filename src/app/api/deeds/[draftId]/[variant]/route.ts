import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userHasPermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissionKeys";
import { getDeedTemplate } from "@/lib/deeds/registry";
import { renderDeed } from "@/lib/deeds/render";
import type { DeedData } from "@/lib/deeds/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unduh draft akta sebagai .docx (minuta = garis hitam, salinan = garis merah). */
export async function GET(_req: Request, { params }: { params: { draftId: string; variant: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.kind === "client") return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  if (!(await userHasPermission(session.user.id, PERMISSIONS.VIEW_JOBS))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }
  const variant = params.variant === "salinan" ? "salinan" : params.variant === "minuta" ? "minuta" : null;
  if (!variant) return NextResponse.json({ error: "Varian tidak dikenal." }, { status: 400 });

  const draft = await prisma.deedDraft.findUnique({
    where: { id: params.draftId },
    select: { templateKey: true, data: true, job: { select: { jobNumber: true } } }
  });
  const template = draft ? getDeedTemplate(draft.templateKey) : null;
  if (!draft || !template) return NextResponse.json({ error: "Draft tidak ditemukan." }, { status: 404 });

  const { buffer } = renderDeed(template, (draft.data ?? {}) as DeedData, variant);
  const label = variant === "minuta" ? "Minuta" : "Salinan";
  const fileName = `${label}_${template.title.replace(/[^A-Za-z0-9]+/g, "_")}_${draft.job.jobNumber}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store"
    }
  });
}
