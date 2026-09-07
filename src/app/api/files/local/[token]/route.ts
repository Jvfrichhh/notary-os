import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifyLocalFileToken } from "@/lib/storage/localFileToken";
import { LOCAL_STORAGE_BASE_PATH } from "@/lib/storage/LocalStorageProvider";
import { prisma } from "@/lib/prisma";

/**
 * Endpoint ini SENGAJA tidak menerima storageKey langsung -- hanya token HMAC
 * bertanda tangan + expiry yang dibuat oleh LocalStorageProvider.getSignedUrl(),
 * yang mana itu sendiri hanya dipanggil setelah /api/documents/[id]/download
 * memverifikasi login + permission. Jadi walau URL ini "publik" (tidak ada
 * pengecekan session di sini), token-nya tidak bisa ditebak/diubah dan
 * kedaluwarsa dalam waktu singkat -- setara presigned URL R2 di production.
 */
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const payload = verifyLocalFileToken(params.token);
  if (!payload) {
    return NextResponse.json({ error: "Link kedaluwarsa atau tidak valid." }, { status: 403 });
  }

  const { storageKey } = payload;

  // Ambil metadata (nama file & content-type) dari record yang cocok --
  // dicoba di versi dulu (lebih spesifik), baru dokumen current.
  const version = await prisma.documentVersion.findFirst({ where: { storageKey } });
  const document = version ? null : await prisma.document.findFirst({ where: { storageKey } });

  const fileName = version?.fileName ?? document?.fileName ?? path.basename(storageKey);
  const contentType = version?.fileType ?? document?.fileType ?? "application/octet-stream";

  if (!version && !document) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  const fullPath = path.join(LOCAL_STORAGE_BASE_PATH, storageKey);

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(fullPath);
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan di storage." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=0, no-store"
    }
  });
}
