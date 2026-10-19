import type { ApplicableClientField, ClientMatch, ExtractedFields } from "@/lib/ai/documentFields";

/** Bentuk analisis yang aman dikirim ke client component (tanggal sudah string). */
export type AiAnalysisView = {
  id: string;
  documentType: string | null;
  legible: boolean;
  qualityScore: number | null;
  issues: string[];
  extractedFields: ExtractedFields;
  clientMatch: ClientMatch | null;
  summary: string | null;
  model: string;
  createdAt: string;
};

export type ClientCurrentValues = Partial<Record<ApplicableClientField, string | null>>;

/** Ubah baris Prisma menjadi bentuk yang bisa dikirim ke client component. */
export function toAnalysisView(row: {
  id: string;
  documentType: string | null;
  legible: boolean;
  qualityScore: number | null;
  issues: unknown;
  extractedFields: unknown;
  clientMatch: unknown;
  summary: string | null;
  model: string;
  createdAt: Date;
}): AiAnalysisView {
  return {
    id: row.id,
    documentType: row.documentType,
    legible: row.legible,
    qualityScore: row.qualityScore,
    issues: Array.isArray(row.issues) ? (row.issues as unknown[]).map(String) : [],
    extractedFields: (row.extractedFields && typeof row.extractedFields === "object" ? row.extractedFields : {}) as ExtractedFields,
    clientMatch: (row.clientMatch && typeof row.clientMatch === "object" ? row.clientMatch : null) as ClientMatch | null,
    summary: row.summary,
    model: row.model,
    createdAt: row.createdAt.toISOString()
  };
}
