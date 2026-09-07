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

const schema = z.object({
  number: z.string().min(1, "Nomor wajib diisi"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  clientId: z.string().min(1, "Client wajib dipilih"),
  serviceType: z.string().optional(),
  status: z.enum(["DRAFT", "PROCESS", "DONE"]).default("PROCESS"),
  picId: z.string().optional(),
  documentId: z.string().optional(),
  notes: z.string().optional()
});

export type LegalisasiFormState = {
  errors?: Record<string, string[]>;
  formError?: string;
};

async function validateDocumentBelongsToClient(documentId: string | null, clientId: string) {
  if (!documentId) return null;
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) return "Dokumen tidak ditemukan.";
  if (document.clientId && document.clientId !== clientId) {
    return "Dokumen yang dipilih bukan milik client tersebut.";
  }
  return null;
}

export async function createLegalisasi(_prevState: LegalisasiFormState, formData: FormData): Promise<LegalisasiFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_LEGALISASI);

  const parsed = schema.safeParse({
    number: formData.get("number"),
    date: formData.get("date"),
    clientId: formData.get("clientId"),
    serviceType: formData.get("serviceType") || undefined,
    status: formData.get("status") || "PROCESS",
    picId: formData.get("picId") || undefined,
    documentId: formData.get("documentId") || undefined,
    notes: formData.get("notes") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) return { formError: "Client tidak ditemukan." };

  const documentId = toNullable(data.documentId ?? "");
  const docError = await validateDocumentBelongsToClient(documentId, data.clientId);
  if (docError) return { formError: docError };

  let record;
  try {
    record = await prisma.legalisasi.create({
      data: {
        number: data.number.trim(),
        date: new Date(data.date),
        clientId: data.clientId,
        serviceType: toNullable(data.serviceType ?? ""),
        status: data.status,
        picId: toNullable(data.picId ?? ""),
        documentId,
        notes: toNullable(data.notes ?? "")
      }
    });
  } catch {
    return { formError: "Nomor Legalisasi sudah digunakan." };
  }

  await writeAuditLog({
    userId: user.id,
    action: "legalisasi_created",
    entityType: "Legalisasi",
    entityId: record.id,
    newValue: { number: record.number, clientId: record.clientId, status: record.status }
  });

  revalidatePath("/legalisasi");
  redirect(`/legalisasi/${record.id}`);
}

export async function updateLegalisasi(id: string, _prevState: LegalisasiFormState, formData: FormData): Promise<LegalisasiFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_LEGALISASI);

  const before = await prisma.legalisasi.findUnique({ where: { id } });
  if (!before) return { formError: "Record tidak ditemukan." };

  const parsed = schema.omit({ clientId: true }).safeParse({
    number: formData.get("number"),
    date: formData.get("date"),
    serviceType: formData.get("serviceType") || undefined,
    status: formData.get("status") || "PROCESS",
    picId: formData.get("picId") || undefined,
    documentId: formData.get("documentId") || undefined,
    notes: formData.get("notes") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const documentId = toNullable(data.documentId ?? "");
  const docError = await validateDocumentBelongsToClient(documentId, before.clientId);
  if (docError) return { formError: docError };

  let record;
  try {
    record = await prisma.legalisasi.update({
      where: { id },
      data: {
        number: data.number.trim(),
        date: new Date(data.date),
        serviceType: toNullable(data.serviceType ?? ""),
        status: data.status,
        picId: toNullable(data.picId ?? ""),
        documentId,
        notes: toNullable(data.notes ?? "")
      }
    });
  } catch {
    return { formError: "Nomor Legalisasi sudah digunakan." };
  }

  await writeAuditLog({
    userId: user.id,
    action: "legalisasi_updated",
    entityType: "Legalisasi",
    entityId: id,
    previousValue: { number: before.number, status: before.status, picId: before.picId, documentId: before.documentId },
    newValue: { number: record.number, status: record.status, picId: record.picId, documentId: record.documentId }
  });

  revalidatePath("/legalisasi");
  revalidatePath(`/legalisasi/${id}`);
  redirect(`/legalisasi/${id}`);
}

async function setRecordStatus(id: string, recordStatus: "ACTIVE" | "ARCHIVED") {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_LEGALISASI);
  const before = await prisma.legalisasi.findUnique({ where: { id } });
  if (!before) return;
  const updated = await prisma.legalisasi.update({ where: { id }, data: { recordStatus } });
  await writeAuditLog({
    userId: user.id,
    action: recordStatus === "ARCHIVED" ? "legalisasi_archived" : "legalisasi_restored",
    entityType: "Legalisasi",
    entityId: id,
    previousValue: { recordStatus: before.recordStatus },
    newValue: { recordStatus: updated.recordStatus }
  });
  revalidatePath("/legalisasi");
  revalidatePath(`/legalisasi/${id}`);
}

export async function archiveLegalisasi(id: string) {
  return setRecordStatus(id, "ARCHIVED");
}
export async function restoreLegalisasi(id: string) {
  return setRecordStatus(id, "ACTIVE");
}
