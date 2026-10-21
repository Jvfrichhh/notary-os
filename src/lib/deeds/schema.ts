/**
 * Skema isian form draft akta. Murni data (tanpa import server) supaya bisa
 * dipakai form di browser maupun generator di server.
 */

export type FieldDef =
  | {
      kind: "text" | "textarea" | "date" | "time" | "number" | "money";
      key: string;
      label: string;
      required?: boolean;
      placeholder?: string;
      help?: string;
      default?: string;
      /** Lebar penuh di grid form. */
      wide?: boolean;
    }
  | { kind: "select"; key: string; label: string; options: string[]; default?: string; help?: string; wide?: boolean }
  /** Identitas orang (komparisi). */
  | { kind: "person"; key: string; label: string; help?: string; optional?: boolean }
  /** Daftar berulang (mis. para pemberi kuasa, pemegang saham). */
  | { kind: "list"; key: string; label: string; itemLabel: string; min?: number; max?: number; fields: FieldDef[]; help?: string };

export interface SectionDef {
  title: string;
  description?: string;
  fields: FieldDef[];
}

/** Sub-isian identitas orang, urutan sesuai komparisi. */
export const PERSON_FIELDS: { key: keyof Person; label: string; placeholder?: string; kind?: "select" | "date"; options?: string[] }[] = [
  { key: "sapaan", label: "Sapaan", kind: "select", options: ["Tuan", "Nyonya", "Nona"] },
  { key: "nama", label: "Nama lengkap (sesuai KTP)" },
  { key: "tempatLahir", label: "Tempat lahir" },
  { key: "tanggalLahir", label: "Tanggal lahir", kind: "date" },
  { key: "pekerjaan", label: "Pekerjaan", placeholder: "mis. Karyawan Swasta" },
  { key: "kewarganegaraan", label: "Kewarganegaraan", placeholder: "Indonesia" },
  { key: "alamat", label: "Alamat (jalan & nomor)" },
  { key: "rt", label: "RT", placeholder: "001" },
  { key: "rw", label: "RW", placeholder: "002" },
  { key: "kelurahan", label: "Kelurahan/Desa (lengkap)", placeholder: "Kelurahan Babakan" },
  { key: "kecamatan", label: "Kecamatan", placeholder: "Bogor Tengah" },
  { key: "kota", label: "Kota/Kabupaten (lengkap)", placeholder: "Kota Bogor" },
  { key: "nik", label: "NIK" }
];

export interface Person {
  sapaan?: string;
  nama?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  pekerjaan?: string;
  kewarganegaraan?: string;
  alamat?: string;
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  kota?: string;
  nik?: string;
}

export type DeedData = Record<string, unknown>;

/** Bagian yang sama untuk semua akta: data akta & saksi. */
export const COMMON_SECTIONS: SectionDef[] = [
  {
    title: "Data Akta",
    fields: [
      { kind: "text", key: "nomorAkta", label: "Nomor akta", placeholder: "mis. 12" },
      { kind: "date", key: "tanggalAkta", label: "Tanggal akta" },
      { kind: "time", key: "jamAkta", label: "Jam", default: "10:00" },
      { kind: "text", key: "kotaPengadilan", label: "Domisili hukum (Pengadilan Negeri)", default: "Bogor" }
    ]
  },
  {
    title: "Saksi-saksi",
    description: "Dua orang saksi yang hadir saat penandatanganan (biasanya karyawan kantor).",
    fields: [
      { kind: "person", key: "saksi1", label: "Saksi pertama" },
      { kind: "person", key: "saksi2", label: "Saksi kedua" }
    ]
  }
];
