"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { assertPermission, userHasPermission } from "@/lib/permissions";
import { isProtocolDocument } from "@/lib/protocolDocuments";
import { PERMISSIONS } from "@/lib/permissionKeys";
import { writeAuditLog } from "@/lib/audit";
import { AiError, isAiEnabled } from "@/lib/ai/client";
import {
  analyzeDocument,
  DocumentAnalysisError,
  APPLICABLE_CLIENT_FIELDS,
  type ApplicableClientField,
  type ExtractedFields
} from "@/lib/ai/documentAnalysis";

export interface AiActionState {
  error?: string;
  success?: string;
}

/**
 * Jalankan analisis AI untuk satu dokumen. Butuh UPLOAD_DOCUMENTS (staff yang
 * memang bekerja dengan dokumen). Hasil disimpan sebagai usulan; tidak ada
 * data lain yang berubah.
 */
export async function runDocumentAnalysis(
  documentId: string,
  expectedLabel: string | null,
  returnPath: string,
  _prev: AiActionState,
  _formData: FormData
): Promise<AiActionState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);
  if (!isAiEnabled()) return { error: "Fitur AI belum diaktifkan di server." };
  if (!/^\/(documents|jobs|clients)\/[A-Za-z0-9_-]+$/.test(returnPath)) returnPath = "/documents";
  // File akta resmi (minuta/salinan/dll.) tidak boleh dibaca lewat AI oleh yang tak berhak.
  if ((await isProtocolDocument(documentId)) && !(await userHasPermission(user.id, PERMISSIONS.VIEW_MINUTA))) {
    return { error: "Dokumen protokol akta hanya bisa dianalisis oleh Notaris." };
  }

  try {
    const analysis = await analyzeDocument({ documentId, userId: user.id, expectedLabel });
    await writeAuditLog({
      userId: user.id,
      action: "ai_document_analyzed",
      entityType: "Document",
      entityId: documentId,
      newValue: {
        analysisId: analysis.id,
        documentType: analysis.documentType,
        legible: analysis.legible,
        qualityScore: analysis.qualityScore,
        model: analysis.model
      }
    });
    revalidatePath(returnPath);
    return { success: "Analisis selesai." };
  } catch (err) {
    if (err instanceof DocumentAnalysisError || err instanceof AiError) return { error: err.message };
    console.error("[ai] analyzeDocument gagal", err);
    return { error: "Analisis gagal karena kesalahan tak terduga. Coba lagi." };
  }
}

/**
 * Salin kolom hasil ekstraksi yang DIPILIH staff ke data klien. Butuh
 * EDIT_CLIENTS. Setiap perubahan tercatat di audit log dengan nilai lama.
 */
export async function applyAnalysisToClient(
  analysisId: string,
  returnPath: string,
  _prev: AiActionState,
  formData: FormData
): Promise<AiActionState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_CLIENTS);

  const analysis = await prisma.documentAiAnalysis.findUnique({
    where: { id: analysisId },
    select: { id: true, extractedFields: true, document: { select: { clientId: true } } }
  });
  if (!analysis || !analysis.document.clientId) return { error: "Analisis atau klien tidak ditemukan." };

  const fields = (analysis.extractedFields ?? {}) as ExtractedFields;
  const chosen = formData
    .getAll("field")
    .map(String)
    .filter((f): f is ApplicableClientField => (APPLICABLE_CLIENT_FIELDS as readonly string[]).includes(f));
  if (chosen.length === 0) return { error: "Pilih minimal satu kolom yang akan diterapkan." };

  const client = await prisma.client.findUnique({
    where: { id: analysis.document.clientId },
    select: { id: true, nik: true, npwp: true, address: true, city: true, companyName: true, occupation: true }
  });
  if (!client) return { error: "Klien tidak ditemukan." };

  const data: Partial<Record<ApplicableClientField, string>> = {};
  const previous: Partial<Record<ApplicableClientField, string | null>> = {};
  for (const f of chosen) {
    const v = fields[f];
    if (!v) continue;
    data[f] = String(v);
    previous[f] = client[f];
  }
  if (Object.keys(data).length === 0) return { error: "Kolom yang dipilih tidak punya nilai hasil ekstraksi." };

  await prisma.client.update({ where: { id: client.id }, data });
  await writeAuditLog({
    userId: user.id,
    action: "client_updated_from_ai_extraction",
    entityType: "Client",
    entityId: client.id,
    previousValue: previous,
    newValue: { ...data, analysisId }
  });
  revalidatePath(returnPath);
  revalidatePath(`/clients/${client.id}`);
  return { success: `Data klien diperbarui: ${Object.keys(data).join(", ")}.` };
}
