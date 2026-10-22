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
  return m + s + g + k > 0;
}
