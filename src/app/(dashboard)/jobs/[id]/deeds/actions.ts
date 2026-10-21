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
import { autoSetJobStatus, notifyJobPeople } from "@/lib/jobAutomation";

/** Perbandingan isi JSON tanpa peduli urutan key (jsonb Postgres mengurutkan ulang key). */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((v, i) => sameJson(v, bb[i]));
  }
  const ka = Object.keys(a as object).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b as object).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

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
  // Mulai menyusun akta = pekerjaan berjalan; PIC kosong -> pembuat draft menjadi PIC.
  await prisma.job.updateMany({ where: { id: jobId, picId: null }, data: { picId: user.id } });
  await autoSetJobStatus(jobId, "IN_PROGRESS", "draft akta mulai disusun", user.id, { onlyFrom: ["INBOX"] });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/deeds");
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

  const draft = await prisma.deedDraft.findUnique({ where: { id: draftId }, select: { id: true, jobId: true, deedId: true, data: true, updatedAt: true } });
  if (!draft) return { ok: false, error: "Draft tidak ditemukan." };
  if (draft.deedId) return { ok: false, error: "Draft sudah disahkan dan terkunci." };
  // Tidak ada perubahan -> tidak perlu versi dokumen baru di Document Vault.
  if (sameJson(draft.data, data)) {
    const hasVault = await prisma.document.count({ where: { jobId: draft.jobId, description: { contains: `[draft-akta:${draftId}:` } } });
    if (hasVault > 0) return { ok: true, savedAt: draft.updatedAt.toISOString(), vaultFiles: 0 };
  }
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
  const draft = await prisma.deedDraft.findUnique({ where: { id: draftId }, select: { id: true, jobId: true, templateKey: true, deedId: true } });
  if (!draft || draft.deedId) return; // draft yang sudah disahkan tidak boleh dihapus
  await prisma.deedDraft.delete({ where: { id: draftId } });
  // File Word draft ini di Document Vault ikut diarsipkan (tidak dihapus, riwayat tetap ada).
  const archived = await prisma.document.updateMany({
    where: { jobId: draft.jobId, status: "ACTIVE", description: { contains: `[draft-akta:${draftId}:` } },
    data: { status: "ARCHIVED" }
  });
  await writeAuditLog({ userId: user.id, action: "deed_draft_deleted", entityType: "DeedDraft", entityId: draftId, previousValue: { ...draft, archivedDocuments: archived.count } });
  revalidatePath(`/jobs/${draft.jobId}`);
  revalidatePath("/documents");
  revalidatePath("/deeds");
  redirect(`/jobs/${draft.jobId}`);
}

export interface FinalizeState {
  error?: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * "Sahkan & Daftarkan" (khusus Notaris): setelah akta ditandatangani,
 * nomor akta final dimasukkan, lalu dalam satu langkah:
 *  1. Minuta & Salinan dibuat ulang dengan nomor final dan disimpan ke
 *     Document Vault sebagai Dokumen Final;
 *  2. dibuat Akta (Lemari Arsip), Repertorium (nomor urut tahun akta),
 *     Minuta dan Salinan yang menunjuk ke dokumen tadi -- dalam satu transaksi;
 *  3. draft dikunci (deedId terisi).
 * Nomor akta disimpan sebagai "nomor/bulan/tahun" karena penomoran akta
 * berulang setiap bulan sementara nomor akta di arsip wajib unik.
 */
export async function finalizeDeedDraft(draftId: string, _prev: FinalizeState, formData: FormData): Promise<FinalizeState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_MINUTA);
  await assertPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);

  const nomor = String(formData.get("nomor") ?? "").trim().replace(/\.$/, "");
  const tanggal = String(formData.get("tanggal") ?? "").trim();
  if (!/^\d{1,4}$/.test(nomor)) return { error: "Nomor akta harus angka, mis. 12." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: "Tanggal akta wajib diisi." };
  if (formData.get("ditandatangani") !== "on") return { error: "Centang konfirmasi bahwa akta sudah ditandatangani." };

  const draft = await prisma.deedDraft.findUnique({
    where: { id: draftId },
    select: { id: true, deedId: true, templateKey: true, data: true, job: { select: { id: true, clientId: true } } }
  });
  const template = draft ? getDeedTemplate(draft.templateKey) : null;
  if (!draft || !template) return { error: "Draft tidak ditemukan." };
  if (draft.deedId) return { error: "Draft ini sudah disahkan." };

  const [y, m] = tanggal.split("-").map(Number);
  const deedNumber = `${Number(nomor)}/${pad2(m)}/${y}`;
  if (await prisma.deed.findUnique({ where: { deedNumber }, select: { id: true } })) {
    return { error: `Nomor akta ${nomor} untuk bulan ${pad2(m)}/${y} sudah terdaftar di arsip.` };
  }

  // 1. Kunci nomor & tanggal final ke isian draft, lalu buat file final.
  const data = { ...((draft.data ?? {}) as Record<string, unknown>), nomorAkta: String(Number(nomor)), tanggalAkta: tanggal };
  await prisma.deedDraft.update({ where: { id: draftId }, data: { data: data as Prisma.InputJsonValue, updatedById: user.id } });
  const vault = await syncDraftToVault(draftId, user.id, { final: true });
  if (vault.error || !vault.documentIds.minuta) return { error: vault.error ?? "Gagal menyimpan file akta. Coba lagi." };

  const signers = template.signers(data).map((p) => (typeof p.nama === "string" ? p.nama.trim().toUpperCase() : "")).filter(Boolean);
  const deedDate = new Date(`${tanggal}T00:00:00.000Z`);

  // 2. Arsip + repertorium dalam satu transaksi (nomor urut repertorium tidak
  //    "terpakai" bila langkah lain gagal).
  let deedId: string;
  try {
    deedId = await prisma.$transaction(async (tx) => {
      const deed = await tx.deed.create({
        data: {
          deedNumber,
          deedDate,
          deedType: template.title.replace(/^Akta\s+/i, ""),
          clientId: draft.job.clientId,
          jobId: draft.job.id,
          notaryId: user.id,
          status: "DONE"
        }
      });
      const seq = await tx.$queryRaw<{ value: number }[]>`
        INSERT INTO repertorium_counters (year, value) VALUES (${y}, 1)
        ON CONFLICT (year) DO UPDATE SET value = repertorium_counters.value + 1
        RETURNING value
      `;
      const repertorium = await tx.repertorium.create({
        data: {
          sequenceNumber: seq[0].value,
          year: y,
          deedId: deed.id,
          deedDate,
          deedType: deed.deedType,
          appearerName: signers.join(", ").slice(0, 500) || "[...]",
          description: `Nomor akta ${deedNumber}`,
          clientId: draft.job.clientId,
          jobId: draft.job.id,
          createdBy: user.id
        }
      });
      await tx.minuta.create({
        data: { deedId: deed.id, jobId: draft.job.id, documentId: vault.documentIds.minuta, repertoriumId: repertorium.id, notes: "Dibuat otomatis dari draft akta" }
      });
      if (vault.documentIds.salinan) {
        await tx.salinan.create({ data: { deedId: deed.id, jobId: draft.job.id, documentId: vault.documentIds.salinan, createdBy: user.id } });
      }
      await tx.deedDraft.update({ where: { id: draftId }, data: { deedId: deed.id } });
      return deed.id;
    });
  } catch (err) {
    console.error("[akta] gagal mengesahkan draft", err);
    return { error: "Gagal mendaftarkan akta. Periksa apakah nomor akta sudah dipakai, lalu coba lagi." };
  }

  await writeAuditLog({
    userId: user.id,
    action: "deed_draft_finalized",
    entityType: "Deed",
    entityId: deedId,
    newValue: { draftId, deedNumber, templateKey: draft.templateKey }
  });
  // Semua draft akta job ini sudah disahkan -> pekerjaan otomatis selesai.
  const openDrafts = await prisma.deedDraft.count({ where: { jobId: draft.job.id, deedId: null } });
  if (openDrafts === 0) {
    const done = await autoSetJobStatus(draft.job.id, "COMPLETED", `akta ${deedNumber} disahkan`, user.id, { force: true });
    if (done) await notifyJobPeople(draft.job.id, `Akta ${deedNumber} disahkan; pekerjaan selesai.`, { pic: true });
  }
  revalidatePath(`/jobs/${draft.job.id}`);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/archive");
  revalidatePath("/notary-record");
  revalidatePath("/deeds");
  redirect(`/archive/deed/${deedId}`);
}
