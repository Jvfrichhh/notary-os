import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userHasPermission, PERMISSIONS } from "@/lib/permissions";
import { getFileStorage } from "@/lib/storage";
import { isProtocolDocument } from "@/lib/protocolDocuments";
import { safeContentType } from "@/lib/uploadValidation";

/**
 * Satu-satunya pintu masuk untuk membuka/mengunduh dokumen. Route ini yang
 * mengecek login + permission -- setelah lolos, baru minta signed URL
 * jangka pendek dari FileStorageService (redirect ke R2 di production, atau
 * ke /api/files/local/[token] saat development). Tidak ada cara mengakses
 * file hanya dengan menebak/mengubah URL storageKey secara langsung.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.kind === "client" || session.user.revoked) {
    return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
  }

  const allowed = await userHasPermission(session.user.id, PERMISSIONS.VIEW_DOCUMENTS);
  if (!allowed) {
    return NextResponse.json({ error: "Anda tidak memiliki akses ke dokumen ini." }, { status: 403 });
  }

  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  // Minuta/salinan/grosse/kutipan resmi: hanya untuk pemegang izin view_minuta.
  if ((await isProtocolDocument(document.id)) && !(await userHasPermission(session.user.id, PERMISSIONS.VIEW_MINUTA))) {
    return NextResponse.json({ error: "Dokumen protokol akta hanya bisa dibuka oleh Notaris." }, { status: 403 });
  }

  const versionParam = req.nextUrl.searchParams.get("version");
  let storageKey = document.storageKey;
  let fileName = document.fileName;

  if (versionParam) {
    const versionNumber = parseInt(versionParam, 10);
    const version = await prisma.documentVersion.findUnique({
      where: { documentId_versionNumber: { documentId: document.id, versionNumber } }
    });
    if (!version) {
      return NextResponse.json({ error: "Versi dokumen tidak ditemukan." }, { status: 404 });
    }
    storageKey = version.storageKey;
    fileName = version.fileName ?? document.fileName;
  }

  const signedUrl = await getFileStorage().getSignedUrl(storageKey, 300, { contentType: safeContentType(fileName) });
  return NextResponse.redirect(new URL(signedUrl, req.url));
}
