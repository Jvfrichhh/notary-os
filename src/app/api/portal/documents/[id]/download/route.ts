import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalPrincipal } from "@/lib/portalSession";
import { getFileStorage } from "@/lib/storage";

/**
 * Unduh dokumen oleh KLIEN. Hanya dokumen yang:
 *  - category CLIENT_DOCUMENT, aktif, dan
 *  - clientId === klien yang login, dan
 *  - diunggah lewat portal (uploadedByClientAccountId terisi) ATAU terpasang
 *    pada item checklist job milik klien tersebut (dokumen yang kantor
 *    unggah atas nama klien untuk checklist itu).
 * Dokumen kerja/draft/final kantor (WORKING/FINAL/SUPPORTING) tidak pernah
 * bisa diunduh lewat endpoint ini. Setelah lolos, redirect ke signed URL
 * berumur pendek -- sama seperti endpoint internal.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await getPortalPrincipal();
  if (!result.ok) {
    const status = result.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: "Akses ditolak." }, { status });
  }
  const { clientId } = result.principal;

  const document = await prisma.document.findFirst({
    where: {
      id: params.id,
      clientId,
      category: "CLIENT_DOCUMENT",
      status: "ACTIVE",
      OR: [
        { uploadedByClientAccountId: { not: null } },
        { checklistItems: { some: { checklist: { job: { clientId } } } } }
      ]
    },
    select: { storageKey: true }
  });
  // 404 untuk "tidak ada" maupun "bukan milik Anda" -- sengaja sama.
  if (!document) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });

  const signedUrl = await getFileStorage().getSignedUrl(document.storageKey, 300);
  return NextResponse.redirect(new URL(signedUrl, req.url));
}
