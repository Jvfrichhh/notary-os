/**
 * Skema isian form draft akta. Murni data (tanpa import server) supaya bisa
 * dipakai form di browser maupun generator di server.
 */

/** Tampilkan field hanya bila salah satu pilihan di field `key` (jenis "checks") dicentang. */
export interface ShowIf {
  key: string;
  anyOf: string[];
}

export type FieldDef = (
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
  | { kind: "person"; key: string; label: string; help?: string; optional?: boolean; default?: Person }
  /** Daftar berulang (mis. para pemberi kuasa, pemegang saham). */
  | { kind: "list"; key: string; label: string; itemLabel: string; min?: number; max?: number; fields: FieldDef[]; help?: string }
  /** Pilihan ganda (kotak centang); nilainya string[]. */
  | { kind: "checks"; key: string; label: string; options: string[]; help?: string }
) & { showIf?: ShowIf };

/** Apakah field ditampilkan untuk data ini (tanpa pilihan sama sekali = tampilkan semua). */
export function isFieldVisible(f: FieldDef, data: Record<string, unknown>): boolean {
  if (!f.showIf) return true;
  const chosen = Array.isArray(data[f.showIf.key]) ? (data[f.showIf.key] as string[]) : [];
  if (chosen.length === 0) return true;
  return f.showIf.anyOf.some((o) => chosen.includes(o));
}

export interface SectionDef {
  title: string;
  description?: string;
  fields: FieldDef[];
}

/** Sub-isian identitas orang, urutan sesuai komparisi. */
export const PERSON_FIELDS: { key: keyof Person; label: string; placeholder?: string; kind?: "select" | "date"; options?: string[] }[] = [
  { key: "sapaan", label: "Sapaan", kind: "select", options: ["Tuan", "Nyonya", "Nona"] },
  { key: "nama", label: "Nama lengkap (sesuai KTP)" },
  { key: "gelar", label: "Gelar (ditulis lengkap, mis. Sarjana Hukum)", placeholder: "kosongkan bila tidak ada" },
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
  /** Gelar ditulis lengkap setelah nama, mis. "Sarjana Hukum, Magister Kenotariatan". */
  gelar?: string;
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

/** Saksi tetap kantor (standar baku kantor Notaris Ari Yudani Aprianti). */
export const SAKSI_TETAP: [Person, Person] = [
  {
    sapaan: "Tuan",
    nama: "Deny Chandra",
    gelar: "Sarjana Hukum",
    tempatLahir: "Jakarta",
    tanggalLahir: "1973-10-29",
    pekerjaan: "Karyawan Swasta",
    kewarganegaraan: "Indonesia",
    alamat: "Cimanggu Kecil",
    rt: "001",
    rw: "007",
    kelurahan: "Kelurahan Ciwaringin",
    kecamatan: "Bogor Tengah",
    kota: "Kota Bogor",
    nik: "3271032910730007"
  },
  {
    sapaan: "Tuan",
    nama: "Komar Hidayat",
    tempatLahir: "Sumedang",
    tanggalLahir: "1980-06-06",
    pekerjaan: "Karyawan Swasta",
    kewarganegaraan: "Indonesia",
    alamat: "Kampung Sukamulya Nomor 16",
    rt: "001",
    rw: "005",
    kelurahan: "Kelurahan Sukasari",
    kecamatan: "Bogor Timur",
    kota: "Kota Bogor",
    nik: "3211172704800006"
  }
];

/** Bagian yang sama untuk semua akta: data akta & saksi. */
export const COMMON_SECTIONS: SectionDef[] = [
  {
    title: "Data Akta",
    fields: [
      // Nomor akta baru diketahui saat penandatanganan: diisi Notaris di "Sahkan & Daftarkan".
      { kind: "date", key: "tanggalAkta", label: "Rencana tanggal akta" },
      { kind: "time", key: "jamAkta", label: "Jam", default: "10:00" },
      { kind: "text", key: "kotaPengadilan", label: "Domisili hukum (Pengadilan Negeri)", default: "Bogor" }
    ]
  },
  {
    title: "Saksi-saksi",
    description: "Dua orang saksi yang hadir saat penandatanganan. Terisi otomatis dengan saksi tetap kantor; ubah bila berbeda.",
    fields: [
      { kind: "person", key: "saksi1", label: "Saksi pertama", default: SAKSI_TETAP[0] },
      { kind: "person", key: "saksi2", label: "Saksi kedua", default: SAKSI_TETAP[1] }
    ]
  }
];
