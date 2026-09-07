"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";

function toNullable(value: FormDataEntryValue | null | undefined) {
  const v = typeof value === "string" ? value.trim() : "";
  return v === "" ? null : v;
}

const WASIAT_STATUSES = ["DIBUAT", "DICATAT", "DILAPORKAN", "BUKTI_TERSEDIA"] as const;

const schema = z.object({
  clientId: z.string().min(1, "Client wajib dipilih"),
  deedNumber: z.string().optional(),
  date: z.string().optional(),
  wasiatType: z.string().optional(),
  repertoriumId: z.string().optional(),
  jobId: z.string().optional(),
  status: z.enum(WASIAT_STATUSES).default("DIBUAT"),
  evidenceDocumentId: z.string().optional(),
  notes: z.string().optional()
});

export type WasiatFormState = {
  errors?: Record<string, string[]>;
  formError?: string;
};

async function validateRelations(clientId: string, jobId: string | null, evidenceDocumentId: string | null) {
  if (jobId) {
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, clientId: true } });
    if (!job) return "Job tidak ditemukan.";
    if (job.clientId !== clientId) return "Job yang dipilih bukan milik client tersebut.";
  }
  if (evidenceDocumentId) {
    const document = await prisma.document.findUnique({ where: { id: evidenceDocumentId } });
    if (!document) return "Dokumen bukti tidak ditemukan.";
    if (document.clientId && document.clientId !== clientId) {
      return "Dokumen bukti yang dipilih bukan milik client tersebut.";
    }
  }
  return null;
}

export async function createWasiat(_prevState: WasiatFormState, formData: FormData): Promise<WasiatFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_WASIAT);

  const parsed = schema.safeParse({
    clientId: formData.get("clientId"),
    deedNumber: formData.get("deedNumber") || undefined,
    date: formData.get("date") || undefined,
    wasiatType: formData.get("wasiatType") || undefined,
    repertoriumId: formData.get("repertoriumId") || undefined,
    jobId: formData.get("jobId") || undefined,
    status: formData.get("status") || "DIBUAT",
    evidenceDocumentId: formData.get("evidenceDocumentId") || undefined,
    notes: formData.get("notes") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) return { formError: "Client tidak ditemukan." };

  const jobId = toNullable(data.jobId ?? "");
  const evidenceDocumentId = toNullable(data.evidenceDocumentId ?? "");
  const relError = await validateRelations(data.clientId, jobId, evidenceDocumentId);
  if (relError) return { formError: relError };

  const record = await prisma.wasiat.create({
    data: {
      clientId: data.clientId,
      deedNumber: toNullable(data.deedNumber ?? ""),
      date: data.date ? new Date(data.date) : null,
      wasiatType: toNullable(data.wasiatType ?? ""),
      repertoriumId: toNullable(data.repertoriumId ?? ""),
      jobId,
      status: data.status,
      evidenceDocumentId,
      notes: toNullable(data.notes ?? "")
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "wasiat_created",
    entityType: "Wasiat",
    entityId: record.id,
    newValue: { clientId: record.clientId, status: record.status, deedNumber: record.deedNumber }
  });

  revalidatePath("/wasiat");
  redirect(`/wasiat/${record.id}`);
}

export async function updateWasiat(id: string, _prevState: WasiatFormState, formData: FormData): Promise<WasiatFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_WASIAT);

  const before = await prisma.wasiat.findUnique({ where: { id } });
  if (!before) return { formError: "Record tidak ditemukan." };

  const parsed = schema.omit({ clientId: true, jobId: true }).safeParse({
    deedNumber: formData.get("deedNumber") || undefined,
    date: formData.get("date") || undefined,
    wasiatType: formData.get("wasiatType") || undefined,
    repertoriumId: formData.get("repertoriumId") || undefined,
    status: formData.get("status") || "DIBUAT",
    evidenceDocumentId: formData.get("evidenceDocumentId") || undefined,
    notes: formData.get("notes") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const evidenceDocumentId = toNullable(data.evidenceDocumentId ?? "");
  const relError = await validateRelations(before.clientId, before.jobId, evidenceDocumentId);
  if (relError) return { formError: relError };

  const record = await prisma.wasiat.update({
    where: { id },
    data: {
      deedNumber: toNullable(data.deedNumber ?? ""),
      date: data.date ? new Date(data.date) : null,
      wasiatType: toNullable(data.wasiatType ?? ""),
      repertoriumId: toNullable(data.repertoriumId ?? ""),
      status: data.status,
      evidenceDocumentId,
      notes: toNullable(data.notes ?? "")
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "wasiat_updated",
    entityType: "Wasiat",
    entityId: id,
    previousValue: { status: before.status, deedNumber: before.deedNumber, evidenceDocumentId: before.evidenceDocumentId },
    newValue: { status: record.status, deedNumber: record.deedNumber, evidenceDocumentId: record.evidenceDocumentId }
  });

  revalidatePath("/wasiat");
  revalidatePath(`/wasiat/${id}`);
  redirect(`/wasiat/${id}`);
}

async function setRecordStatus(id: string, recordStatus: "ACTIVE" | "ARCHIVED") {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_WASIAT);
  const before = await prisma.wasiat.findUnique({ where: { id } });
  if (!before) return;
  const updated = await prisma.wasiat.update({ where: { id }, data: { recordStatus } });
  await writeAuditLog({
    userId: user.id,
    action: recordStatus === "ARCHIVED" ? "wasiat_archived" : "wasiat_restored",
    entityType: "Wasiat",
    entityId: id,
    previousValue: { recordStatus: before.recordStatus },
    newValue: { recordStatus: updated.recordStatus }
  });
  revalidatePath("/wasiat");
  revalidatePath(`/wasiat/${id}`);
}

export async function archiveWasiat(id: string) {
  return setRecordStatus(id, "ARCHIVED");
}
export async function restoreWasiat(id: string) {
  return setRecordStatus(id, "ACTIVE");
}
