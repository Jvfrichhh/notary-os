"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/portalSession";
import { issueUploadTicket, resolveUploadFromForm, type TicketResult } from "@/lib/upload/directUpload";
import { writeAuditLog } from "@/lib/audit";
import { notifyJobPeople } from "@/lib/jobAutomation";
import { draftHash } from "@/lib/deeds/review";

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

  // PIC diberi tahu; job tanpa PIC -> Notaris yang diberi tahu.
  await notifyJobPeople(job.id, `Klien ${principal.client.fullName} mengunggah "${item.label}" untuk ${job.jobNumber} — menunggu pemeriksaan.`, {
    pic: true
  });

  revalidatePath(`/portal/jobs/${job.id}`);
  revalidatePath("/portal");
  revalidatePath(`/jobs/${job.id}`);
  return { success: `"${upload.fileName}" berhasil dikirim dan menunggu pemeriksaan kantor.` };
}

/**
 * Klien menyetujui draft akta atau mengirim koreksi. Hanya untuk draft pada
 * pekerjaan miliknya, review terakhir yang belum diputuskan, dan isi draft
 * yang masih sama dengan saat dibagikan.
 */
export async function respondDraftReview(reviewId: string, decision: "APPROVED" | "CHANGES", formData: FormData) {
  const principal = await requireClientAccount();
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  const review = await prisma.deedDraftReview.findFirst({
    where: { id: reviewId, draft: { job: { clientId: principal.clientId, recordStatus: "ACTIVE" } } },
    select: {
      id: true,
      decision: true,
      dataHash: true,
      draftId: true,
      draft: { select: { data: true, title: true, deedId: true, job: { select: { id: true, jobNumber: true } } } }
    }
  });
  if (!review || review.decision || review.draft.deedId) return;
  if (decision === "CHANGES" && note.length < 3) return;
  const latest = await prisma.deedDraftReview.findFirst({ where: { draftId: review.draftId }, orderBy: { sharedAt: "desc" }, select: { id: true } });
  if (latest?.id !== review.id || draftHash(review.draft.data) !== review.dataHash) return; // versi lama

  await prisma.deedDraftReview.update({
    where: { id: review.id },
    data: { decision, note: decision === "CHANGES" ? note : note || null, decidedAt: new Date(), decidedByAccountId: principal.accountId }
  });
  await writeAuditLog({
    userId: null,
    action: decision === "APPROVED" ? "deed_draft_client_approved" : "deed_draft_client_changes",
    entityType: "DeedDraft",
    entityId: review.draftId,
    newValue: { reviewId: review.id, clientAccountId: principal.accountId, note: note || undefined }
  });
  const job = review.draft.job;
  await notifyJobPeople(
    job.id,
    decision === "APPROVED"
      ? `Klien ${principal.client.fullName} MENYETUJUI draft ${review.draft.title ?? "akta"} (${job.jobNumber}).`
      : `Klien ${principal.client.fullName} minta koreksi draft ${review.draft.title ?? "akta"} (${job.jobNumber}): ${note}`,
    { pic: true, notary: true }
  );
  revalidatePath(`/portal/jobs/${job.id}`);
  revalidatePath(`/jobs/${job.id}/deeds/${review.draftId}`);
}
