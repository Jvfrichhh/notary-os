"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { generateRepertoriumSequence } from "@/lib/idGenerators";

const EDIT_REPERTORIUM = PERMISSIONS.EDIT_REPERTORIUM;

function toNullable(value: FormDataEntryValue | null | undefined) {
  const v = typeof value === "string" ? value.trim() : "";
  return v === "" ? null : v;
}

export type RepertoriumFormState = {
  errors?: Record<string, string[]>;
  formError?: string;
};

const createSchema = z.object({
  deedId: z.string().min(1, "Akta wajib dipilih."),
  appearerName: z.string().min(1, "Nama penghadap wajib diisi."),
  description: z.string().optional()
});

/**
 * Sengaja HANYA menerima deedId + appearerName + description dari form.
 * deedDate, deedType, clientId, jobId SELALU diambil dari Deed yang dipilih
 * (bukan diketik ulang), supaya tidak ada data akta yang terduplikasi/
 * mismatch antara Deed dan Repertorium (requirement: "jangan duplikasi
 * data Akta yang tidak perlu").
 */
export async function createRepertorium(
  _prevState: RepertoriumFormState,
  formData: FormData
): Promise<RepertoriumFormState> {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_REPERTORIUM);

  const parsed = createSchema.safeParse({
    deedId: formData.get("deedId"),
    appearerName: formData.get("appearerName"),
    description: formData.get("description") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const deed = await prisma.deed.findUnique({ where: { id: data.deedId } });
  if (!deed) return { formError: "Akta tidak ditemukan." };

  // Deed <-> Repertorium sekarang one-to-one (deedId @unique). Cek eksplisit
  // dulu supaya user dapat pesan yang jelas, bukan error constraint mentah
  // dari database kalau race terlewat.
  const existing = await prisma.repertorium.findUnique({ where: { deedId: data.deedId } });
  if (existing) {
    return { formError: `Akta ini sudah tercatat di Repertorium (${existing.year}/${String(existing.sequenceNumber).padStart(4, "0")}).` };
  }

  // deedDate disimpan UTC-midnight (date-only) -- getUTCFullYear supaya
  // tahunnya persis yang dipilih user, independen dari timezone server.
  const year = deed.deedDate.getUTCFullYear();
  const sequenceNumber = await generateRepertoriumSequence(year);

  let repertorium;
  try {
    repertorium = await prisma.repertorium.create({
      data: {
        sequenceNumber,
        year,
        deedId: deed.id,
        deedDate: deed.deedDate,
        deedType: deed.deedType,
        appearerName: data.appearerName,
        description: toNullable(data.description),
        clientId: deed.clientId,
        jobId: deed.jobId,
        createdBy: user.id
      }
    });
  } catch {
    // Fallback kalau ada race condition (dua request nyaris bersamaan) yang
    // lolos dari cek existing di atas -- unique constraint deedId di DB
    // tetap jadi penjaga terakhir.
    return { formError: "Akta ini sudah tercatat di Repertorium oleh proses lain. Muat ulang halaman." };
  }

  await writeAuditLog({
    userId: user.id,
    action: "repertorium_created",
    entityType: "Repertorium",
    entityId: repertorium.id,
    newValue: { year, sequenceNumber, deedNumber: deed.deedNumber }
  });

  revalidatePath("/notary-record");
  revalidatePath(`/archive/deed/${deed.id}`);
  redirect(`/notary-record/${repertorium.id}`);
}

const updateSchema = z.object({
  appearerName: z.string().min(1, "Nama penghadap wajib diisi."),
  description: z.string().optional()
});

/**
 * Pola plain (id, formData) => Promise<void> -- sama seperti updateMinuta /
 * updateDerivativeDocument di archive/actions.ts -- karena dipakai langsung
 * sebagai inline <form action> di halaman detail (Server Component), BUKAN
 * lewat useFormState. Deed/tahun/nomor urut tidak bisa diubah lewat sini --
 * itu identitas resmi record.
 */
export async function updateRepertorium(repertoriumId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_REPERTORIUM);

  const before = await prisma.repertorium.findUnique({ where: { id: repertoriumId } });
  if (!before) return;

  const parsed = updateSchema.safeParse({
    appearerName: formData.get("appearerName"),
    description: formData.get("description") || undefined
  });
  if (!parsed.success) return;
  const data = parsed.data;

  const updated = await prisma.repertorium.update({
    where: { id: repertoriumId },
    data: { appearerName: data.appearerName, description: toNullable(data.description) }
  });

  await writeAuditLog({
    userId: user.id,
    action: "repertorium_updated",
    entityType: "Repertorium",
    entityId: repertoriumId,
    previousValue: { appearerName: before.appearerName, description: before.description },
    newValue: { appearerName: updated.appearerName, description: updated.description }
  });

  revalidatePath(`/notary-record/${repertoriumId}`);
  revalidatePath("/notary-record");
}

async function setRecordStatus(id: string, recordStatus: "ACTIVE" | "ARCHIVED") {
  const user = await requireUser();
  await assertPermission(user.id, EDIT_REPERTORIUM);

  await prisma.repertorium.update({ where: { id }, data: { recordStatus } });

  await writeAuditLog({
    userId: user.id,
    action: recordStatus === "ARCHIVED" ? "repertorium_archived" : "repertorium_restored",
    entityType: "Repertorium",
    entityId: id
  });

  revalidatePath("/notary-record");
  revalidatePath(`/notary-record/${id}`);
}

export async function archiveRepertorium(id: string) {
  return setRecordStatus(id, "ARCHIVED");
}
export async function restoreRepertorium(id: string) {
  return setRecordStatus(id, "ACTIVE");
}
