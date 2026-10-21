"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { assertPermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissionKeys";
import { writeAuditLog } from "@/lib/audit";
import { getDeedTemplate } from "@/lib/deeds/registry";
import { syncDraftToVault } from "@/lib/deeds/vault";

const MAX_DATA_BYTES = 200_000;

/** Buat draft akta baru dari halaman Draft Akta (job dipilih di form). */
export async function createDeedDraftFromList(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  return createDeedDraft(jobId, formData);
}

/** Buat draft akta baru untuk job, terisi awal dari data klien/job. */
export async function createDeedDraft(jobId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);
  const templateKey = String(formData.get("templateKey") ?? "");
  const template = getDeedTemplate(templateKey);
  if (!template) return;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, description: true, client: { select: { fullName: true, nik: true, address: true, city: true, companyName: true, clientType: true } } }
  });
  if (!job) return;

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const data = { tanggalAkta: today, ...(template.prefill?.({ client: job.client, job: { description: job.description } }) ?? {}) };

  const draft = await prisma.deedDraft.create({
    data: { jobId, templateKey, title: template.title, data: data as Prisma.InputJsonValue, createdById: user.id, updatedById: user.id }
  });
  await writeAuditLog({ userId: user.id, action: "deed_draft_created", entityType: "DeedDraft", entityId: draft.id, newValue: { jobId, templateKey } });
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/deeds/${draft.id}`);
}

/** Simpan isian draft (JSON dari form). */
export async function saveDeedDraft(
  draftId: string,
  json: string
): Promise<{ ok: boolean; error?: string; warning?: string; savedAt?: string; vaultFiles?: number }> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);
  if (json.length > MAX_DATA_BYTES) return { ok: false, error: "Data terlalu besar." };
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "Data tidak valid." };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "Data tidak valid." };

  const draft = await prisma.deedDraft.findUnique({ where: { id: draftId }, select: { id: true, jobId: true } });
  if (!draft) return { ok: false, error: "Draft tidak ditemukan." };
  const updated = await prisma.deedDraft.update({
    where: { id: draftId },
    data: { data: data as Prisma.InputJsonValue, updatedById: user.id }
  });
  // Minuta & Salinan (.docx) ikut tersimpan di Document Vault sebagai Dokumen Kerja.
  const vault = await syncDraftToVault(draftId, user.id);
  revalidatePath(`/jobs/${draft.jobId}`);
  revalidatePath("/documents");
  return { ok: true, savedAt: updated.updatedAt.toISOString(), vaultFiles: vault.saved, warning: vault.error };
}

export async function deleteDeedDraft(draftId: string) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);
  const draft = await prisma.deedDraft.findUnique({ where: { id: draftId }, select: { id: true, jobId: true, templateKey: true } });
  if (!draft) return;
  await prisma.deedDraft.delete({ where: { id: draftId } });
  await writeAuditLog({ userId: user.id, action: "deed_draft_deleted", entityType: "DeedDraft", entityId: draftId, previousValue: draft });
  revalidatePath(`/jobs/${draft.jobId}`);
  redirect(`/jobs/${draft.jobId}`);
}
