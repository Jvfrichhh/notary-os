/**
 * Konstanta & tipe hasil analisis dokumen AI yang AMAN diimpor dari client
 * component (tidak mengimpor Prisma atau modul server apa pun).
 */

export const DOCUMENT_TYPES = [
  "KTP",
  "KK",
  "NPWP",
  "PASPOR",
  "SERTIFIKAT_TANAH",
  "AKTA",
  "SURAT_KUASA",
  "BUKTI_BAYAR",
  "LAINNYA"
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  KTP: "KTP",
  KK: "Kartu Keluarga",
  NPWP: "NPWP",
  PASPOR: "Paspor",
  SERTIFIKAT_TANAH: "Sertifikat tanah",
  AKTA: "Akta",
  SURAT_KUASA: "Surat kuasa",
  BUKTI_BAYAR: "Bukti pembayaran",
  LAINNYA: "Lainnya"
};

/** Kolom yang mungkin terbaca dari dokumen. Hanya sebagian yang bisa diterapkan ke data klien. */
export interface ExtractedFields {
  nik?: string | null;
  fullName?: string | null;
  birthPlace?: string | null;
  birthDate?: string | null; // YYYY-MM-DD jika terbaca
  address?: string | null;
  /** Rincian alamat KTP (untuk komparisi akta). */
  rt?: string | null;
  rw?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  occupation?: string | null;
  gender?: string | null;
  nationality?: string | null;
  city?: string | null;
  npwp?: string | null;
  companyName?: string | null;
  certificateNumber?: string | null;
  landArea?: string | null;
  ownerName?: string | null;
  documentNumber?: string | null;
  documentDate?: string | null;
  notes?: string | null;
}

/** Kolom ekstraksi yang boleh disalin ke tabel clients (dengan persetujuan staff). */
export const APPLICABLE_CLIENT_FIELDS = ["nik", "npwp", "address", "city", "companyName"] as const;
export type ApplicableClientField = (typeof APPLICABLE_CLIENT_FIELDS)[number];
export const CLIENT_FIELD_LABEL: Record<ApplicableClientField, string> = {
  nik: "NIK",
  npwp: "NPWP",
  address: "Alamat",
  city: "Kota",
  companyName: "Nama perusahaan"
};

export type MatchVerdict = "match" | "mismatch" | "unknown";
export interface ClientMatch {
  fullName?: { client: string | null; document: string | null; verdict: MatchVerdict };
  nik?: { client: string | null; document: string | null; verdict: MatchVerdict };
  npwp?: { client: string | null; document: string | null; verdict: MatchVerdict };
}

