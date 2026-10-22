import { prisma } from "@/lib/prisma";
import { getFileStorage } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { getDeedTemplate, variantLabels } from "@/lib/deeds/registry";
import { renderDeed } from "@/lib/deeds/render";
import type { DeedData } from "@/lib/deeds/schema";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Penanda di kolom description supaya simpan berikutnya menjadi versi baru, bukan dokumen baru. */
const marker = (draftId: string, variant: "minuta" | "salinan") => `[draft-akta:${draftId}:${variant}]`;

/**
 * Simpan Minuta & Salinan draft akta ke Document Vault (kategori Dokumen
 * Kerja, terhubung ke job & klien). Dokumen yang sudah ada mendapat versi baru.
 * Mengembalikan jumlah file yang tersimpan; error storage tidak menggagalkan
 * penyimpanan draft (dilaporkan ke pemanggil).
 */
export async function syncDraftToVault(
  draftId: string,
  userId: string,
  opts: { final?: boolean } = {}
): Promise<{ saved: number; error?: string; documentIds: Partial<Record<"minuta" | "salinan", string>> }> {
  const documentIds: Partial<Record<"minuta" | "salinan", string>> = {};
  const draft = await prisma.deedDraft.findUnique({
    where: { id: draftId },
    select: { id: true, templateKey: true, data: true, job: { select: { id: true, jobNumber: true, clientId: true } } }
  });
  const template = draft ? getDeedTemplate(draft.templateKey) : null;
  if (!draft || !template) return { saved: 0, error: "Draft tidak ditemukan.", documentIds };
  // Setelah disahkan, dokumen berpindah ke kategori Dokumen Final.
  const category = opts.final ? "FINAL_DOCUMENT" : "WORKING_DOCUMENT";

  let saved = 0;
  try {
    for (const variant of ["minuta", "salinan"] as const) {
      const { buffer } = renderDeed(template, (draft.data ?? {}) as DeedData, variant);
      const label = variantLabels(template)[variant].replace(/ /g, "_");
      const fileName = `${label}_${template.title.replace(/[^A-Za-z0-9]+/g, "_")}_${draft.job.jobNumber}.docx`;
      const tag = marker(draft.id, variant);
      const upload = await getFileStorage().upload({ buffer, fileName, contentType: DOCX_MIME, folder: `documents/job-${draft.job.id}` });

      const existing = await prisma.document.findFirst({
        where: { jobId: draft.job.id, description: { contains: tag } },
        select: { id: true, fileName: true, fileType: true, fileSize: true, storageKey: true, uploadedBy: true, uploadedAt: true }
      });

      if (!existing) {
        const doc = await prisma.$transaction(async (tx) => {
          const d = await tx.document.create({
            data: {
              jobId: draft.job.id,
              clientId: draft.job.clientId,
              fileName,
              fileType: DOCX_MIME,
              fileSize: upload.size,
              category,
              description: `${label} ${template.title} — draft dari Nexora ${tag}`,
              storageKey: upload.storageKey,
              uploadedBy: userId
            }
          });
          await tx.documentVersion.create({
            data: { documentId: d.id, versionNumber: 1, isCurrent: true, storageKey: upload.storageKey, fileName, fileType: DOCX_MIME, fileSize: upload.size, uploadedBy: userId, notes: "Draft akta disimpan" }
          });
          return d;
        });
        documentIds[variant] = doc.id;
        await writeAuditLog({ userId, action: "deed_draft_saved_to_vault", entityType: "Document", entityId: doc.id, newValue: { draftId, variant, versionNumber: 1 } });
      } else {
        const last = await prisma.documentVersion.findFirst({ where: { documentId: existing.id }, orderBy: { versionNumber: "desc" }, select: { versionNumber: true } });
        const next = (last?.versionNumber ?? 1) + 1;
        await prisma.$transaction(async (tx) => {
          if (!last) {
            // Dokumen tanpa riwayat versi: catat versi lama sebagai v1 dulu.
            await tx.documentVersion.create({
              data: { documentId: existing.id, versionNumber: 1, isCurrent: false, storageKey: existing.storageKey, fileName: existing.fileName, fileType: existing.fileType, fileSize: existing.fileSize, uploadedBy: existing.uploadedBy, uploadedAt: existing.uploadedAt }
            });
          } else {
            await tx.documentVersion.updateMany({ where: { documentId: existing.id }, data: { isCurrent: false } });
          }
          await tx.documentVersion.create({
            data: { documentId: existing.id, versionNumber: next, isCurrent: true, storageKey: upload.storageKey, fileName, fileType: DOCX_MIME, fileSize: upload.size, uploadedBy: userId, notes: "Draft akta diperbarui" }
          });
          await tx.document.update({
            where: { id: existing.id },
            data: { fileName, fileType: DOCX_MIME, fileSize: upload.size, storageKey: upload.storageKey, status: "ACTIVE", category }
          });
        });
        documentIds[variant] = existing.id;
        await writeAuditLog({ userId, action: "deed_draft_saved_to_vault", entityType: "Document", entityId: existing.id, newValue: { draftId, variant, versionNumber: next } });
      }
      saved++;
    }
  } catch (err) {
    console.error("[akta] gagal menyimpan ke Document Vault", err);
    return { saved, error: "Draft tersimpan, tetapi file Word gagal disimpan ke Document Vault. Coba simpan lagi.", documentIds };
  }
  return { saved, documentIds };
}
