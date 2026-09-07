import { prisma } from "@/lib/prisma";

/**
 * Dokumen yang ditawarkan sebagai pilihan "link ke Document Vault" untuk
 * satu Deed -- dibatasi ke dokumen milik job yang sama (atau client yang
 * sama kalau deed tidak terikat job), supaya staff tidak salah pilih file
 * dari job lain. Tidak membuat jalur upload baru -- murni SELECT dari
 * Document yang sudah ada.
 */
export async function getDocumentOptionsForDeed(deedId: string) {
  const deed = await prisma.deed.findUnique({ where: { id: deedId }, select: { jobId: true, clientId: true } });
  if (!deed) return [];

  return prisma.document.findMany({
    where: {
      status: "ACTIVE",
      ...(deed.jobId ? { jobId: deed.jobId } : { clientId: deed.clientId })
    },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, fileName: true }
  });
}
