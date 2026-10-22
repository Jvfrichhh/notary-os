import { prisma } from "@/lib/prisma";

/**
 * true bila dokumen ini adalah file protokol notaris yang sudah resmi
 * (minuta, salinan, grosse, atau kutipan akta). File seperti ini hanya boleh
 * dibuka oleh pemegang izin view_minuta dan diganti oleh pemegang edit_minuta.
 */
export async function isProtocolDocument(documentId: string): Promise<boolean> {
  const where = { documentId };
  const [m, s, g, k] = await Promise.all([
    prisma.minuta.count({ where }),
    prisma.salinan.count({ where }),
    prisma.grosse.count({ where }),
    prisma.kutipan.count({ where })
  ]);
  if (m + s + g + k > 0) return true;
  // File Word dari draft akta yang sudah disahkan (akta notaris maupun akta
  // PPAT) ditandai "[draft-akta:<id>:minuta|salinan]" di deskripsinya.
  const doc = await prisma.document.findUnique({ where: { id: documentId }, select: { description: true } });
  const draftId = doc?.description?.match(/\[draft-akta:([A-Za-z0-9_-]+):/)?.[1];
  if (!draftId) return false;
  const draft = await prisma.deedDraft.findUnique({ where: { id: draftId }, select: { deedId: true, ppatDeedId: true } });
  return Boolean(draft?.deedId || draft?.ppatDeedId);
}
