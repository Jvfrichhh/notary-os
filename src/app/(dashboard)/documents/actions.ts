"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { getFileStorage } from "@/lib/storage";
import { validateUploadFile } from "@/lib/uploadValidation";

const CATEGORY_VALUES = ["CLIENT_DOCUMENT", "WORKING_DOCUMENT", "FINAL_DOCUMENT", "SUPPORTING_DOCUMENT"] as const;

const uploadSchema = z.object({
  clientId: z.string().optional().or(z.literal("")),
  jobId: z.string().optional().or(z.literal("")),
  category: z.enum(CATEGORY_VALUES),
  description: z.string().optional().or(z.literal(""))
});

export type DocumentFormState = {
  errors?: Partial<Record<keyof z.infer<typeof uploadSchema>, string[]>>;
  formError?: string;
};

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value.trim() : null;
}

function folderFor(clientId: string | null, jobId: string | null) {
  if (jobId) return `documents/job-${jobId}`;
  if (clientId) return `documents/client-${clientId}`;
  return "documents/misc";
}

export async function uploadDocument(_prevState: DocumentFormState, formData: FormData): Promise<DocumentFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);

  const parsed = uploadSchema.safeParse({
    clientId: formData.get("clientId") || "",
    jobId: formData.get("jobId") || "",
    category: formData.get("category"),
    description: formData.get("description") || ""
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { formError: "Pilih file terlebih dahulu." };
  }

  const validation = validateUploadFile(file);
  if (!validation.ok) {
    return { formError: validation.message };
  }

  const data = parsed.data;
  const clientId = toNullable(data.clientId);
  const jobId = toNullable(data.jobId);

  let job: { id: string; clientId: string } | null = null;
  if (jobId) {
    job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, clientId: true } });
    if (!job) return { formError: "Job tidak ditemukan." };
  }
  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return { formError: "Client tidak ditemukan." };
  }
  // Kalau clientId dan jobId dua-duanya diisi, job tsb wajib benar-benar
  // milik client itu -- kalau tidak, upload ditolak (mencegah dokumen
  // "nyasar" ke client/job yang salah).
  if (job && clientId && job.clientId !== clientId) {
    return { formError: "Job yang dipilih bukan milik client tersebut." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await getFileStorage().upload({
    buffer,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    folder: folderFor(clientId, jobId)
  });

  const document = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        clientId,
        jobId,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: upload.size,
        category: data.category,
        description: toNullable(data.description),
        storageKey: upload.storageKey,
        uploadedBy: user.id
      }
    });

    await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        versionNumber: 1,
        isCurrent: true,
        storageKey: upload.storageKey,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: upload.size,
        uploadedBy: user.id
      }
    });

    return doc;
  });

  await writeAuditLog({
    userId: user.id,
    action: "document_uploaded",
    entityType: "Document",
    entityId: document.id,
    newValue: { fileName: document.fileName, category: document.category, clientId, jobId }
  });

  revalidatePath("/documents");
  if (jobId) revalidatePath(`/jobs/${jobId}`);
  if (clientId) revalidatePath(`/clients/${clientId}`);

  redirect(`/documents/${document.id}`);
}

export async function uploadNewVersion(documentId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) return;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const validation = validateUploadFile(file);
  if (!validation.ok) return;

  const notes = toNullable(String(formData.get("notes") ?? ""));

  const existingVersions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { versionNumber: "desc" }
  });
  const nextVersionNumber = (existingVersions[0]?.versionNumber ?? 1) + 1;

  const buffer = Buffer.from(await file.arrayBuffer());
  // File baru selalu dapat storageKey baru (randomUUID di provider) --
  // file versi lama TIDAK pernah ditimpa/dihapus. Upload fisik dilakukan
  // SEBELUM transaksi DB supaya kalau ada error, yang terjadi paling buruk
  // adalah file baru "menggantung" di storage -- bukan kehilangan current
  // version yang valid di database.
  const upload = await getFileStorage().upload({
    buffer,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    folder: folderFor(document.clientId, document.jobId)
  });

  // Semua perubahan status "current version" + insert versi baru + update
  // Document dilakukan dalam SATU transaksi -- kalau salah satu gagal,
  // semuanya di-rollback, sehingga tidak pernah ada momen tanpa current version.
  const updated = await prisma.$transaction(async (tx) => {
    if (existingVersions.length === 0) {
      // Dokumen lama (mis. dari seed) mungkin belum punya baris versi sama
      // sekali -- backfill versi 1 dari metadata Document saat ini dulu,
      // supaya nomor versi tetap berurutan & tidak menimpa apa pun.
      await tx.documentVersion.create({
        data: {
          documentId,
          versionNumber: 1,
          isCurrent: false,
          storageKey: document.storageKey,
          fileName: document.fileName,
          fileType: document.fileType,
          fileSize: document.fileSize,
          uploadedBy: document.uploadedBy,
          uploadedAt: document.uploadedAt
        }
      });
    } else {
      await tx.documentVersion.updateMany({ where: { documentId }, data: { isCurrent: false } });
    }

    await tx.documentVersion.create({
      data: {
        documentId,
        versionNumber: nextVersionNumber,
        isCurrent: true,
        storageKey: upload.storageKey,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: upload.size,
        uploadedBy: user.id,
        notes
      }
    });

    return tx.document.update({
      where: { id: documentId },
      data: {
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: upload.size,
        storageKey: upload.storageKey
      }
    });
  });

  await writeAuditLog({
    userId: user.id,
    action: "document_version_uploaded",
    entityType: "Document",
    entityId: documentId,
    previousValue: { fileName: document.fileName, fileSize: document.fileSize },
    newValue: { fileName: updated.fileName, fileSize: updated.fileSize, versionNumber: nextVersionNumber }
  });

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  if (document.jobId) revalidatePath(`/jobs/${document.jobId}`);
  if (document.clientId) revalidatePath(`/clients/${document.clientId}`);
}

export async function archiveDocument(documentId: string) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.DELETE_DOCUMENTS);

  const before = await prisma.document.findUnique({ where: { id: documentId } });
  if (!before) return;

  const document = await prisma.document.update({ where: { id: documentId }, data: { status: "ARCHIVED" } });

  await writeAuditLog({
    userId: user.id,
    action: "document_archived",
    entityType: "Document",
    entityId: document.id,
    previousValue: { status: before.status },
    newValue: { status: document.status }
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  if (document.jobId) revalidatePath(`/jobs/${document.jobId}`);
  if (document.clientId) revalidatePath(`/clients/${document.clientId}`);
}

export async function restoreDocument(documentId: string) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.DELETE_DOCUMENTS);

  const before = await prisma.document.findUnique({ where: { id: documentId } });
  if (!before) return;

  const document = await prisma.document.update({ where: { id: documentId }, data: { status: "ACTIVE" } });

  await writeAuditLog({
    userId: user.id,
    action: "document_restored",
    entityType: "Document",
    entityId: document.id,
    previousValue: { status: before.status },
    newValue: { status: document.status }
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  if (document.jobId) revalidatePath(`/jobs/${document.jobId}`);
  if (document.clientId) revalidatePath(`/clients/${document.clientId}`);
}
