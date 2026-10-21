"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/portalSession";
import { issueUploadTicket, resolveUploadFromForm, type TicketResult } from "@/lib/upload/directUpload";
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
/** Cari item checklist milik klien yang boleh menerima unggahan; null + pesan bila tidak boleh. */
async function findUploadableItem(checklistItemId: string, clientId: string) {
  const item = await prisma.checklistItem.findFirst({
    where: {
      id: checklistItemId,
      checklist: { job: { clientId, recordStatus: "ACTIVE" } }
    },
    select: {
      id: true,
      label: true,
      reviewStatus: true,
      checklist: { select: { job: { select: { id: true, jobNumber: true, picId: true, status: true } } } }
    }
  });
  if (!item) return { item: null, error: "Dokumen yang diminta tidak ditemukan." } as const;
  const job = item.checklist.job;
  if (job.status === "COMPLETED" || job.status === "CANCELLED") {
    return { item: null, error: "Pekerjaan ini sudah selesai/dibatalkan. Hubungi kantor jika perlu mengirim dokumen." } as const;
  }
  if (item.reviewStatus === "ACCEPTED") {
    return { item: null, error: "Dokumen ini sudah diterima kantor dan tidak dapat diganti. Hubungi kantor jika ada perubahan." } as const;
  }
  return { item, error: null } as const;
}

const portalFolder = (jobId: string) => `documents/job-${jobId}/client-uploads`;

/** Tiket unggah langsung untuk klien (file besar tidak lewat server). */
export async function requestPortalUploadTicket(
  checklistItemId: string,
  meta: { fileName: string; fileType: string; fileSize: number }
): Promise<TicketResult> {
  const principal = await requireClientAccount();
  const found = await findUploadableItem(checklistItemId, principal.clientId);
  if (!found.item) return { mode: "error", error: found.error };
  return issueUploadTicket({
    principal: `client:${principal.accountId}`,
    folder: portalFolder(found.item.checklist.job.id),
    ...meta
  });
}

export async function uploadChecklistDocument(
  checklistItemId: string,
  _prev: PortalUploadState,
  formData: FormData
): Promise<PortalUploadState> {
  const principal = await requireClientAccount();
  const found = await findUploadableItem(checklistItemId, principal.clientId);
  if (!found.item) return { error: found.error };
  const item = found.item;
  const job = item.checklist.job;

  const resolved = await resolveUploadFromForm(formData, {
    principal: `client:${principal.accountId}`,
    folder: portalFolder(job.id)
  });
  if (!resolved.ok) return { error: resolved.error };
  const upload = resolved.file;
  const contentType = upload.fileType;

  const document = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        clientId: principal.clientId,
        jobId: job.id,
        fileName: upload.fileName,
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
        fileName: upload.fileName,
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
  return { success: `"${upload.fileName}" berhasil dikirim dan menunggu pemeriksaan kantor.` };
}
