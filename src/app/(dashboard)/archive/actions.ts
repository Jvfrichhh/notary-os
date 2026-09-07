"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

// Seluruh domain Lemari Arsip (Deed/Minuta/Salinan/Grosse/Kutipan) dipagari
// pakai permission edit_minuta yang SUDAH ADA -- bukan permission baru
// per-jenis record, karena secara fungsional ini satu domain "Notary Archive"
// (Blueprint §11, §12, §13, §14). Halaman (view) memakai PERMISSIONS.VIEW_MINUTA
// langsung dari @/lib/permissions.
const EDIT_ARCHIVE = PERMISSIONS.EDIT_MINUTA;

function toNullable(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value.trim() : "";
  return v === "" ? null : v;
}

export type ArchiveFormState = {
  errors?: Record<string, string[]>;
  formError?: string;
};

// ---------------------------------------------------------------------------
// DEED (Akta) -- pusat data yang menghubungkan Client/Job ke Minuta/Salinan/
// Grosse/Kutipan/Repertorium.
// ---------------------------------------------------------------------------

const deedSchema = z.object({
  deedNumber: z.string().min(1, "Nomor akta wajib diisi."),
  deedDate: z.string().min(1, "Tanggal akta wajib diisi."),
  deedType: z.string().min(1, "Jenis akta wajib diisi."),
  clientId: z.string().min(1, "Client wajib dipilih."),
  jobId: z.string().optional(),
  notaryId: z.string().optional()
});

export async function createDeed(_prevState: ArchiveFormState, formData: FormData): Promise<ArchiveFormState> {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);

  const parsed = deedSchema.safeParse({
    deedNumber: formData.get("deedNumber"),
    deedDate: formData.get("deedDate"),
    deedType: formData.get("deedType"),
    clientId: formData.get("clientId"),
    jobId: formData.get("jobId") || undefined,
    notaryId: formData.get("notaryId") || undefined
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const existing = await prisma.deed.findUnique({ where: { deedNumber: data.deedNumber } });
  if (existing) return { formError: `Nomor akta ${data.deedNumber} sudah dipakai.` };

  let deed;
  try {
    deed = await prisma.deed.create({
      data: {
        deedNumber: data.deedNumber,
        deedDate: new Date(data.deedDate),
        deedType: data.deedType,
        clientId: data.clientId,
        jobId: toNullable(data.jobId ?? null),
        notaryId: toNullable(data.notaryId ?? null)
      }
    });
  } catch {
    // Fallback kalau ada race condition (dua request nyaris bersamaan) yang
    // lolos dari cek existing di atas -- sama seperti createRepertorium di
    // notary-record/actions.ts -- unique constraint deedNumber di DB tetap
    // jadi penjaga terakhir, bukan raw error Prisma yang tampil ke user.
    return { formError: `Nomor akta ${data.deedNumber} sudah dipakai oleh proses lain. Muat ulang halaman.` };
  }

  await writeAuditLog({
    userId: user.id,
    action: "deed_created",
    entityType: "Deed",
    entityId: deed.id,
    newValue: { deedNumber: deed.deedNumber, deedType: deed.deedType }
  });

  revalidatePath("/archive");
  if (deed.jobId) revalidatePath(`/jobs/${deed.jobId}`);
  redirect(`/archive/deed/${deed.id}`);
}

export async function updateDeedStatus(deedId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);

  const status = formData.get("status");
  if (typeof status !== "string" || !["DRAFT", "PROCESS", "DONE"].includes(status)) return;

  const before = await prisma.deed.findUnique({ where: { id: deedId } });
  if (!before) return;

  const deed = await prisma.deed.update({ where: { id: deedId }, data: { status: status as never } });

  await writeAuditLog({
    userId: user.id,
    action: "deed_status_changed",
    entityType: "Deed",
    entityId: deedId,
    previousValue: { status: before.status },
    newValue: { status: deed.status }
  });

  revalidatePath(`/archive/deed/${deedId}`);
}

export async function archiveDeed(deedId: string) {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);
  await prisma.deed.update({ where: { id: deedId }, data: { recordStatus: "ARCHIVED" } });
  await writeAuditLog({ userId: user.id, action: "deed_archived", entityType: "Deed", entityId: deedId });
  revalidatePath("/archive");
  revalidatePath(`/archive/deed/${deedId}`);
}

export async function restoreDeed(deedId: string) {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);
  await prisma.deed.update({ where: { id: deedId }, data: { recordStatus: "ACTIVE" } });
  await writeAuditLog({ userId: user.id, action: "deed_restored", entityType: "Deed", entityId: deedId });
  revalidatePath("/archive");
  revalidatePath(`/archive/deed/${deedId}`);
}

// ---------------------------------------------------------------------------
// Shared: link/unlink Document Vault entry ke record arsip (bukan upload baru
// -- cuma memilih Document yang sudah ada di Document Vault).
// ---------------------------------------------------------------------------

type ArchiveKind = "minuta" | "salinan" | "grosse" | "kutipan";

async function assertDocumentBelongsToDeed(documentId: string | null, deedId: string) {
  if (!documentId) return;
  const deed = await prisma.deed.findUnique({ where: { id: deedId } });
  if (!deed) throw new Error("Akta tidak ditemukan.");
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error("Dokumen tidak ditemukan.");

  // Sama seperti getDocumentOptionsForDeed: kalau deed terikat job, dokumen
  // harus milik job itu; kalau tidak, minimal harus milik client yang sama.
  // Sebelumnya kalau deed.jobId kosong, tidak ada validasi sama sekali --
  // dokumen dari client lain bisa ikut tertaut.
  if (deed.jobId) {
    if (doc.jobId !== deed.jobId) {
      throw new Error("Dokumen yang dipilih bukan milik job akta ini.");
    }
  } else if (doc.clientId !== deed.clientId) {
    throw new Error("Dokumen yang dipilih bukan milik client akta ini.");
  }
}

/** Repertorium yang dipilih harus milik Deed yang sama dengan Minuta -- mencegah salah tautan. */
async function assertRepertoriumBelongsToDeed(repertoriumId: string | null, deedId: string) {
  if (!repertoriumId) return;
  const repertorium = await prisma.repertorium.findUnique({ where: { id: repertoriumId } });
  if (!repertorium) throw new Error("Repertorium tidak ditemukan.");
  if (repertorium.deedId !== deedId) throw new Error("Repertorium yang dipilih bukan untuk akta ini.");
}

// ---------------------------------------------------------------------------
// MINUTA
// ---------------------------------------------------------------------------

const minutaSchema = z.object({
  deedId: z.string().min(1, "Akta wajib dipilih."),
  documentId: z.string().optional(),
  repertoriumId: z.string().optional(),
  notes: z.string().optional()
});

export async function createMinuta(_prevState: ArchiveFormState, formData: FormData): Promise<ArchiveFormState> {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);

  const parsed = minutaSchema.safeParse({
    deedId: formData.get("deedId"),
    documentId: formData.get("documentId") || undefined,
    repertoriumId: formData.get("repertoriumId") || undefined,
    notes: formData.get("notes") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const deed = await prisma.deed.findUnique({ where: { id: data.deedId } });
  if (!deed) return { formError: "Akta tidak ditemukan." };

  const documentId = toNullable(data.documentId ?? null);
  try {
    await assertDocumentBelongsToDeed(documentId, data.deedId);
  } catch (e) {
    return { formError: e instanceof Error ? e.message : "Dokumen tidak valid." };
  }

  const repertoriumId = toNullable(data.repertoriumId ?? null);
  try {
    await assertRepertoriumBelongsToDeed(repertoriumId, data.deedId);
  } catch (e) {
    return { formError: e instanceof Error ? e.message : "Repertorium tidak valid." };
  }

  const minuta = await prisma.minuta.create({
    data: {
      deedId: data.deedId,
      jobId: deed.jobId,
      documentId,
      repertoriumId,
      notes: toNullable(data.notes ?? null)
    }
  });

  await writeAuditLog({ userId: user.id, action: "minuta_created", entityType: "Minuta", entityId: minuta.id });

  revalidatePath("/archive");
  revalidatePath(`/archive/deed/${data.deedId}`);
  redirect(`/archive/minuta/${minuta.id}`);
}

export async function updateMinuta(minutaId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);

  const minuta = await prisma.minuta.findUnique({ where: { id: minutaId } });
  if (!minuta) return;

  const documentId = toNullable(formData.get("documentId"));
  try {
    await assertDocumentBelongsToDeed(documentId, minuta.deedId);
  } catch {
    return;
  }

  const repertoriumId = toNullable(formData.get("repertoriumId"));
  try {
    await assertRepertoriumBelongsToDeed(repertoriumId, minuta.deedId);
  } catch {
    return;
  }

  const updated = await prisma.minuta.update({
    where: { id: minutaId },
    data: {
      documentId,
      repertoriumId,
      notes: toNullable(formData.get("notes"))
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "minuta_updated",
    entityType: "Minuta",
    entityId: minutaId,
    previousValue: { documentId: minuta.documentId, notes: minuta.notes },
    newValue: { documentId: updated.documentId, notes: updated.notes }
  });

  revalidatePath(`/archive/minuta/${minutaId}`);
}

// ---------------------------------------------------------------------------
// SALINAN / GROSSE / KUTIPAN -- struktur sangat mirip, dibedakan lewat model
// Prisma yang dipakai (tidak digabung jadi satu fungsi generic supaya tipe
// tetap aman & jelas per model).
// ---------------------------------------------------------------------------

const derivativeSchema = z.object({
  deedId: z.string().min(1, "Akta wajib dipilih."),
  documentId: z.string().optional()
});

export async function createSalinan(_prevState: ArchiveFormState, formData: FormData): Promise<ArchiveFormState> {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);

  const parsed = derivativeSchema.safeParse({
    deedId: formData.get("deedId"),
    documentId: formData.get("documentId") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const deed = await prisma.deed.findUnique({ where: { id: parsed.data.deedId } });
  if (!deed) return { formError: "Akta tidak ditemukan." };

  const documentId = toNullable(parsed.data.documentId ?? null);
  try {
    await assertDocumentBelongsToDeed(documentId, parsed.data.deedId);
  } catch (e) {
    return { formError: e instanceof Error ? e.message : "Dokumen tidak valid." };
  }

  const salinan = await prisma.salinan.create({
    data: { deedId: parsed.data.deedId, jobId: deed.jobId, documentId, createdBy: user.id }
  });

  await writeAuditLog({ userId: user.id, action: "salinan_created", entityType: "Salinan", entityId: salinan.id });
  revalidatePath("/archive");
  revalidatePath(`/archive/deed/${parsed.data.deedId}`);
  redirect(`/archive/salinan/${salinan.id}`);
}

export async function createGrosse(_prevState: ArchiveFormState, formData: FormData): Promise<ArchiveFormState> {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);

  const parsed = derivativeSchema.safeParse({
    deedId: formData.get("deedId"),
    documentId: formData.get("documentId") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const deed = await prisma.deed.findUnique({ where: { id: parsed.data.deedId } });
  if (!deed) return { formError: "Akta tidak ditemukan." };

  const documentId = toNullable(parsed.data.documentId ?? null);
  try {
    await assertDocumentBelongsToDeed(documentId, parsed.data.deedId);
  } catch (e) {
    return { formError: e instanceof Error ? e.message : "Dokumen tidak valid." };
  }

  const grosse = await prisma.grosse.create({
    data: { deedId: parsed.data.deedId, jobId: deed.jobId, documentId }
  });

  await writeAuditLog({ userId: user.id, action: "grosse_created", entityType: "Grosse", entityId: grosse.id });
  revalidatePath("/archive");
  revalidatePath(`/archive/deed/${parsed.data.deedId}`);
  redirect(`/archive/grosse/${grosse.id}`);
}

export async function createKutipan(_prevState: ArchiveFormState, formData: FormData): Promise<ArchiveFormState> {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);

  const parsed = derivativeSchema.safeParse({
    deedId: formData.get("deedId"),
    documentId: formData.get("documentId") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const deed = await prisma.deed.findUnique({ where: { id: parsed.data.deedId } });
  if (!deed) return { formError: "Akta tidak ditemukan." };

  const documentId = toNullable(parsed.data.documentId ?? null);
  try {
    await assertDocumentBelongsToDeed(documentId, parsed.data.deedId);
  } catch (e) {
    return { formError: e instanceof Error ? e.message : "Dokumen tidak valid." };
  }

  const kutipan = await prisma.kutipan.create({
    data: { deedId: parsed.data.deedId, jobId: deed.jobId, documentId }
  });

  await writeAuditLog({ userId: user.id, action: "kutipan_created", entityType: "Kutipan", entityId: kutipan.id });
  revalidatePath("/archive");
  revalidatePath(`/archive/deed/${parsed.data.deedId}`);
  redirect(`/archive/kutipan/${kutipan.id}`);
}

/** Ganti dokumen terkait Salinan/Grosse/Kutipan (edit metadata minimal). */
export async function updateDerivativeDocument(kind: ArchiveKind, id: string, formData: FormData) {
  if (kind === "minuta") return; // Minuta punya updateMinuta sendiri (lebih banyak field)

  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);

  const model = kind === "salinan" ? prisma.salinan : kind === "grosse" ? prisma.grosse : prisma.kutipan;
  const record = await (model as typeof prisma.salinan).findUnique({ where: { id } });
  if (!record) return;

  const documentId = toNullable(formData.get("documentId"));
  try {
    await assertDocumentBelongsToDeed(documentId, record.deedId);
  } catch {
    return;
  }

  await (model as typeof prisma.salinan).update({ where: { id }, data: { documentId } });

  await writeAuditLog({
    userId: user.id,
    action: `${kind}_document_updated`,
    entityType: kind[0].toUpperCase() + kind.slice(1),
    entityId: id,
    previousValue: { documentId: record.documentId },
    newValue: { documentId }
  });

  revalidatePath(`/archive/${kind}/${id}`);
}

/** Update status DRAFT/PROCESS/DONE untuk Grosse & Kutipan. */
export async function updateDerivativeStatus(kind: "grosse" | "kutipan", id: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);

  const status = formData.get("status");
  if (typeof status !== "string" || !["DRAFT", "PROCESS", "DONE"].includes(status)) return;

  const model = kind === "grosse" ? prisma.grosse : prisma.kutipan;
  const record = await (model as typeof prisma.grosse).findUnique({ where: { id } });
  if (!record) return;

  await (model as typeof prisma.grosse).update({ where: { id }, data: { status: status as never } });

  await writeAuditLog({
    userId: user.id,
    action: `${kind}_status_changed`,
    entityType: kind[0].toUpperCase() + kind.slice(1),
    entityId: id,
    previousValue: { status: record.status },
    newValue: { status }
  });

  revalidatePath(`/archive/${kind}/${id}`);
}

/** Archive/restore generik untuk keempat jenis record arsip (soft delete). */
export async function setArchiveRecordStatus(
  kind: ArchiveKind,
  id: string,
  recordStatus: "ACTIVE" | "ARCHIVED"
) {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_ARCHIVE);

  const model =
    kind === "minuta" ? prisma.minuta : kind === "salinan" ? prisma.salinan : kind === "grosse" ? prisma.grosse : prisma.kutipan;

  await (model as typeof prisma.minuta).update({ where: { id }, data: { recordStatus } });

  await writeAuditLog({
    userId: user.id,
    action: recordStatus === "ARCHIVED" ? `${kind}_archived` : `${kind}_restored`,
    entityType: kind[0].toUpperCase() + kind.slice(1),
    entityId: id
  });

  revalidatePath("/archive");
  revalidatePath(`/archive/${kind}/${id}`);
}

export async function archiveMinuta(id: string) {
  return setArchiveRecordStatus("minuta", id, "ARCHIVED");
}
export async function restoreMinuta(id: string) {
  return setArchiveRecordStatus("minuta", id, "ACTIVE");
}
export async function archiveSalinan(id: string) {
  return setArchiveRecordStatus("salinan", id, "ARCHIVED");
}
export async function restoreSalinan(id: string) {
  return setArchiveRecordStatus("salinan", id, "ACTIVE");
}
export async function archiveGrosse(id: string) {
  return setArchiveRecordStatus("grosse", id, "ARCHIVED");
}
export async function restoreGrosse(id: string) {
  return setArchiveRecordStatus("grosse", id, "ACTIVE");
}
export async function archiveKutipan(id: string) {
  return setArchiveRecordStatus("kutipan", id, "ARCHIVED");
}
export async function restoreKutipan(id: string) {
  return setArchiveRecordStatus("kutipan", id, "ACTIVE");
}
