"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/portalSession";
import { validateUploadFile } from "@/lib/uploadValidation";
import { getFileStorage } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export interface PortalUploadState {
  error?: string;
  success?: string;
}

/**
 * Klien mengunggah dokumen untuk SATU item checklist pada job MILIKNYA.
 *
 * Otorisasi (semua di server):
 *  - requireClientAccount() -> clientId terverifikasi dari session + DB.
 *  - Item checklist dicari dengan syarat job.clientId === clientId. Item milik
 *    klien lain -> "tidak ditemukan" (tidak bocor keberadaannya).
 *  - Item yang sudah ACCEPTED tidak bisa ditimpa (hubungi kantor).
 *
 * Efek: Document(category CLIENT_DOCUMENT, uploadedByClientAccountId) +
 * DocumentVersion v1; item.attachedDocumentId diarahkan ke dokumen baru,
 * reviewStatus = PENDING_REVIEW (status checklist tetap MISSING sampai
 * staff menerima); audit log; notifikasi ke PIC job.
 */
export async function uploadChecklistDocument(
  checklistItemId: string,
  _prev: PortalUploadState,
  formData: FormData
): Promise<PortalUploadState> {
  const principal = await requireClientAccount();

  const item = await prisma.checklistItem.findFirst({
    where: {
      id: checklistItemId,
      checklist: { job: { clientId: principal.clientId, recordStatus: "ACTIVE" } }
    },
    select: {
      id: true,
      label: true,
      reviewStatus: true,
      checklist: { select: { job: { select: { id: true, jobNumber: true, picId: true, status: true } } } }
    }
  });
  if (!item) return { error: "Dokumen yang diminta tidak ditemukan." };

  const job = item.checklist.job;
  if (job.status === "COMPLETED" || job.status === "CANCELLED") {
    return { error: "Pekerjaan ini sudah selesai/dibatalkan. Hubungi kantor jika perlu mengirim dokumen." };
  }
  if (item.reviewStatus === "ACCEPTED") {
    return { error: "Dokumen ini sudah diterima kantor dan tidak dapat diganti. Hubungi kantor jika ada perubahan." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file terlebih dahulu." };
  const validation = validateUploadFile(file);
  if (!validation.ok) return { error: validation.message };

  const contentType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await getFileStorage().upload({
    buffer,
    fileName: file.name,
    contentType,
    folder: `documents/job-${job.id}/client-uploads`
  });

  const document = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        clientId: principal.clientId,
        jobId: job.id,
        fileName: file.name,
        fileType: contentType,
        fileSize: upload.size,
        category: "CLIENT_DOCUMENT",
        description: `Diunggah klien via portal untuk: ${item.label}`,
        storageKey: upload.storageKey,
        uploadedBy: null,
        uploadedByClientAccountId: principal.accountId
      }
    });
    await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        versionNumber: 1,
        isCurrent: true,
        storageKey: upload.storageKey,
        fileName: file.name,
        fileType: contentType,
        fileSize: upload.size,
        uploadedBy: null
      }
    });
    await tx.checklistItem.update({
      where: { id: item.id },
      data: {
        attachedDocumentId: doc.id,
        reviewStatus: "PENDING_REVIEW",
        reviewNote: null,
        reviewedAt: null,
        reviewedById: null
      }
    });
    return doc;
  });

  await writeAuditLog({
    userId: null,
    action: "client_document_uploaded",
    entityType: "ChecklistItem",
    entityId: item.id,
    newValue: {
      documentId: document.id,
      fileName: document.fileName,
      clientAccountId: principal.accountId,
      clientId: principal.clientId,
      jobId: job.id
    }
  });

  if (job.picId) {
    await createNotification({
      userId: job.picId,
      type: "document",
      message: `Klien ${principal.client.fullName} mengunggah "${item.label}" untuk ${job.jobNumber} — menunggu pemeriksaan.`,
      relatedEntityType: "Job",
      relatedEntityId: job.id
    });
  }

  revalidatePath(`/portal/jobs/${job.id}`);
  revalidatePath("/portal");
  revalidatePath(`/jobs/${job.id}`);
  return { success: `"${file.name}" berhasil dikirim dan menunggu pemeriksaan kantor.` };
}
