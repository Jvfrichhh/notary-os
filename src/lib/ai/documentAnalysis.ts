import type { DocumentAiAnalysis } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFileStorage } from "@/lib/storage";
import { aiModel, createMessage, firstToolInput, type ContentBlockParam, type ToolDefinition } from "@/lib/ai/client";
import {
  DOCUMENT_TYPES,
  type ClientMatch,
  type DocumentType,
  type ExtractedFields,
  type MatchVerdict
} from "@/lib/ai/documentFields";

export * from "@/lib/ai/documentFields";

/**
 * Analisis dokumen oleh AI = dua hal sekaligus:
 *  1. Ekstraksi: membaca data penting (NIK, nama, alamat, NPWP, nomor
 *     sertifikat, ...) dari foto/PDF yang diunggah.
 *  2. Pra-pemeriksaan: menilai apakah dokumen terbaca, lengkap, dan jenisnya
 *     sesuai dengan yang diminta checklist.
 *
 * Perbandingan dengan data klien (clientMatch) SENGAJA dihitung di kode, bukan
 * oleh model, supaya deterministik dan mudah diuji.
 *
 * Fungsi di file ini tidak memeriksa izin -- itu tugas server action pemanggil.
 */

interface ModelReport {
  document_type: DocumentType;
  legible: boolean;
  quality_score: number;
  issues: string[];
  fields: ExtractedFields;
  summary: string;
}

const REPORT_TOOL: ToolDefinition = {
  name: "report_document_analysis",
  description: "Laporkan hasil pembacaan dokumen dalam struktur tetap. Wajib dipanggil tepat satu kali.",
  input_schema: {
    type: "object",
    properties: {
      document_type: { type: "string", enum: [...DOCUMENT_TYPES], description: "Jenis dokumen yang terlihat." },
      legible: { type: "boolean", description: "true bila teks utama dapat dibaca dengan yakin." },
      quality_score: { type: "integer", minimum: 0, maximum: 100, description: "Perkiraan keterbacaan & kelengkapan, 0-100." },
      issues: {
        type: "array",
        items: { type: "string" },
        description: "Masalah konkret (mis. 'foto buram di bagian alamat', 'sudut kanan terpotong', 'bukan KTP melainkan SIM'). Kosong jika tidak ada."
      },
      fields: {
        type: "object",
        description: "Nilai yang TERBACA LANGSUNG dari dokumen. Jangan menebak; kosongkan (null) bila tidak terbaca.",
        properties: {
          nik: { type: ["string", "null"], description: "16 digit, tanpa spasi." },
          fullName: { type: ["string", "null"] },
          birthPlace: { type: ["string", "null"] },
          birthDate: { type: ["string", "null"], description: "Format YYYY-MM-DD." },
          address: { type: ["string", "null"], description: "Alamat lengkap sebagaimana tertulis (jalan, RT/RW, kel/desa, kecamatan)." },
          city: { type: ["string", "null"], description: "Kabupaten/Kota." },
          npwp: { type: ["string", "null"], description: "Digit saja, tanpa titik/strip." },
          companyName: { type: ["string", "null"] },
          certificateNumber: { type: ["string", "null"] },
          landArea: { type: ["string", "null"], description: "Luas tanah bila ada, mis. '250 m2'." },
          ownerName: { type: ["string", "null"], description: "Nama pemegang hak pada sertifikat." },
          documentNumber: { type: ["string", "null"] },
          documentDate: { type: ["string", "null"], description: "YYYY-MM-DD." },
          notes: { type: ["string", "null"], description: "Catatan singkat lain yang relevan." }
        }
      },
      summary: { type: "string", description: "Satu-dua kalimat Bahasa Indonesia untuk staff kantor notaris." }
    },
    required: ["document_type", "legible", "quality_score", "issues", "fields", "summary"]
  }
};

const SYSTEM_PROMPT = `Anda adalah asisten pemeriksa dokumen di kantor notaris Indonesia.
Tugas Anda membaca SATU dokumen yang diunggah (foto atau PDF) lalu melaporkannya lewat tool report_document_analysis.

Aturan:
- Laporkan hanya yang benar-benar terbaca. Bila ragu atau tidak terbaca, isi null. Jangan pernah mengarang NIK, nama, atau nomor.
- Nilai keterbacaan secara jujur: foto buram, gelap, terpotong, miring parah, atau pantulan cahaya adalah masalah yang harus disebut di issues.
- Bila jenis dokumen tidak sesuai dengan yang diminta (diberikan di pesan), sebutkan di issues dengan jelas.
- Jika dokumen tampak bukan dokumen asli (tangkapan layar, salinan hasil edit), sebutkan sebagai kemungkinan, bukan kepastian.
- summary ditulis singkat, netral, Bahasa Indonesia baku, untuk dibaca staff. Keputusan akhir selalu di tangan staff.`;

export class DocumentAnalysisError extends Error {}

const IMAGE_TYPES: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp"
};
const MAX_ANALYZE_BYTES = 15 * 1024 * 1024;

export function canAnalyzeFileType(fileType: string): boolean {
  const t = fileType.toLowerCase();
  return t === "application/pdf" || t in IMAGE_TYPES;
}

// ---- Normalisasi & pembandingan (deterministik) ----------------------------

const digitsOnly = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");
const normName = (v: string | null | undefined) =>
  (v ?? "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function compareDigits(client: string | null, doc: string | null): MatchVerdict {
  const c = digitsOnly(client);
  const d = digitsOnly(doc);
  if (!c || !d) return "unknown";
  return c === d ? "match" : "mismatch";
}

/** Nama cocok bila identik setelah normalisasi, atau satu memuat semua kata nama yang lain (gelar/nama tengah). */
function compareNames(client: string | null, doc: string | null): MatchVerdict {
  const c = normName(client);
  const d = normName(doc);
  if (!c || !d) return "unknown";
  if (c === d) return "match";
  const cw = new Set(c.split(" "));
  const dw = new Set(d.split(" "));
  const smaller = cw.size <= dw.size ? cw : dw;
  const larger = smaller === cw ? dw : cw;
  const covered = Array.from(smaller).every((w) => larger.has(w));
  return covered && smaller.size >= 2 ? "match" : "mismatch";
}

export function buildClientMatch(
  client: { fullName: string; nik: string | null; npwp: string | null },
  fields: ExtractedFields
): ClientMatch {
  const out: ClientMatch = {};
  // Nama di sertifikat = pemegang hak; untuk dokumen identitas = fullName.
  const docName = fields.fullName ?? fields.ownerName ?? null;
  if (docName) out.fullName = { client: client.fullName, document: docName, verdict: compareNames(client.fullName, docName) };
  if (fields.nik) out.nik = { client: client.nik, document: fields.nik, verdict: compareDigits(client.nik, fields.nik) };
  if (fields.npwp) out.npwp = { client: client.npwp, document: fields.npwp, verdict: compareDigits(client.npwp, fields.npwp) };
  return out;
}

// ---- Alur utama ------------------------------------------------------------

export async function analyzeDocument(params: { documentId: string; userId: string; expectedLabel?: string | null }) {
  const doc = await prisma.document.findUnique({
    where: { id: params.documentId },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      storageKey: true,
      status: true,
      client: { select: { id: true, fullName: true, nik: true, npwp: true, clientType: true, companyName: true } }
    }
  });
  if (!doc || doc.status !== "ACTIVE") throw new DocumentAnalysisError("Dokumen tidak ditemukan.");
  if (!canAnalyzeFileType(doc.fileType)) {
    throw new DocumentAnalysisError("Analisis AI hanya tersedia untuk PDF dan gambar (JPG/PNG). File Word/Excel tidak dibaca.");
  }
  if (doc.fileSize > MAX_ANALYZE_BYTES) {
    throw new DocumentAnalysisError("File terlalu besar untuk dianalisis (maks 15 MB).");
  }

  const buffer = await getFileStorage().getObjectBuffer(doc.storageKey);
  const data = buffer.toString("base64");
  const fileBlock: ContentBlockParam =
    doc.fileType.toLowerCase() === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: IMAGE_TYPES[doc.fileType.toLowerCase()], data } };

  const context: string[] = [`Nama file: ${doc.fileName}.`];
  if (params.expectedLabel) context.push(`Dokumen ini diunggah untuk memenuhi permintaan checklist: "${params.expectedLabel}".`);
  if (doc.client) {
    // Hanya nama & jenis klien yang diberikan sebagai konteks; NIK/NPWP klien
    // TIDAK dikirim supaya model tidak sekadar "menyalin" nilai yang diharapkan.
    context.push(`Dokumen milik klien atas nama "${doc.client.fullName}"${doc.client.clientType ? ` (${doc.client.clientType})` : ""}.`);
  }
  context.push("Baca dokumen berikut dan laporkan lewat tool.");

  const res = await createMessage({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: [{ type: "text", text: context.join(" ") }, fileBlock] }],
    tools: [REPORT_TOOL],
    toolChoice: { type: "tool", name: REPORT_TOOL.name },
    maxTokens: 1500,
    temperature: 0,
    timeoutMs: 90_000
  });

  const report = firstToolInput<ModelReport>(res, REPORT_TOOL.name);
  if (!report) throw new DocumentAnalysisError("Model tidak mengembalikan hasil terstruktur. Coba lagi.");

  const fields = sanitizeFields(report.fields ?? {});
  const clientMatch = doc.client ? buildClientMatch(doc.client, fields) : null;
  const documentType = (DOCUMENT_TYPES as readonly string[]).includes(report.document_type) ? report.document_type : "LAINNYA";

  const analysis = await prisma.documentAiAnalysis.create({
    data: {
      documentId: doc.id,
      model: res.model || aiModel(),
      documentType,
      legible: Boolean(report.legible),
      qualityScore: clampScore(report.quality_score),
      issues: Array.isArray(report.issues) ? report.issues.map(String).slice(0, 10) : [],
      extractedFields: fields as object,
      clientMatch: (clientMatch ?? undefined) as object | undefined,
      summary: String(report.summary ?? "").slice(0, 1000),
      inputTokens: res.usage?.input_tokens ?? null,
      outputTokens: res.usage?.output_tokens ?? null,
      createdById: params.userId
    }
  });
  return analysis;
}

function clampScore(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Buang nilai kosong, potong panjang, rapikan NIK/NPWP ke digit. */
function sanitizeFields(raw: ExtractedFields): ExtractedFields {
  const out: ExtractedFields = {};
  const keys = Object.keys(raw) as (keyof ExtractedFields)[];
  for (const k of keys) {
    const v = raw[k];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s || s.toLowerCase() === "null") continue;
    out[k] = s.slice(0, 500);
  }
  if (out.nik) out.nik = digitsOnly(out.nik) || undefined;
  if (out.npwp) out.npwp = digitsOnly(out.npwp) || undefined;
  if (out.nik && out.nik.length !== 16) {
    // NIK Indonesia selalu 16 digit; selain itu kemungkinan salah baca -> simpan di notes, bukan nik.
    out.notes = [out.notes, `NIK terbaca ${out.nik} (bukan 16 digit, perlu dicek)`].filter(Boolean).join("; ");
    delete out.nik;
  }
  return out;
}

/** Analisis terbaru per dokumen (untuk ditampilkan di UI). */
export async function latestAnalysisFor(documentIds: string[]): Promise<Map<string, DocumentAiAnalysis>> {
  const map = new Map<string, DocumentAiAnalysis>();
  if (documentIds.length === 0) return map;
  const rows = await prisma.documentAiAnalysis.findMany({
    where: { documentId: { in: documentIds } },
    orderBy: { createdAt: "desc" }
  });
  for (const r of rows) if (!map.has(r.documentId)) map.set(r.documentId, r);
  return map;
}
