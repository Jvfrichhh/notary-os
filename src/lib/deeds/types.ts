import type { Block } from "./layout";
import type { DeedData, Person, SectionDef } from "./schema";
import type { DocBlock } from "../office/simpleDocx";

export interface DeedTemplate {
  key: string;
  title: string;
  description: string;
  /** Bagian form khusus akta ini (bagian umum: data akta & saksi ditambahkan otomatis). */
  sections: SectionDef[];
  /** Isi akta lengkap dari judul sampai penutup. */
  build(data: DeedData, variant: "minuta" | "salinan"): Block[];
  /** Penghadap yang menandatangani (blok tanda tangan minuta). */
  signers(data: DeedData): Person[];
  /** Catatan penyusunan khusus akta ini (halaman catatan minuta). */
  notes?(data: DeedData): string[];
  /** Isian awal dari data klien/job. */
  prefill?(ctx: PrefillContext): DeedData;
  /**
   * Akta PPAT: dicetak dengan format akta PPAT (bukan format mesin tik
   * notaris) dan saat disahkan didaftarkan di Buku Daftar Akta PPAT.
   */
  ppat?: {
    /** Jenis perbuatan hukum (PPAT_DEED_TYPES). */
    deedType: string;
    /** Isi akta; lembar 1 = disimpan PPAT, lembar 2 = untuk Kantor Pertanahan. */
    build(data: DeedData, lembar: 1 | 2): DocBlock[];
    /** Data untuk Buku Daftar Akta PPAT. */
    register(data: DeedData): PpatRegisterData;
  };
}

export interface PpatRegisterData {
  partyFrom: string;
  partyTo: string;
  rightType: string | null;
  location: string | null;
  landArea: string | null;
  buildingArea: string | null;
  transactionValue: number | null;
  njopValue: number | null;
  nop: string | null;
  sspDate: string | null;
  sspAmount: number | null;
  sspdDate: string | null;
  sspdAmount: number | null;
}

export interface PrefillContext {
  client: {
    fullName: string;
    nik: string | null;
    address: string | null;
    city: string | null;
    companyName: string | null;
    clientType: string | null;
    /** Hasil baca KTP klien oleh AI (bila ada), untuk melengkapi identitas. */
    ktp?: Partial<Person>;
  };
  job: { description: string | null; ptChanges?: string[] };
}

/** Orang dari data klien (untuk prefill), dilengkapi hasil baca KTP bila ada. */
export function personFromClient(c: PrefillContext["client"]): Person {
  const base: Person = { nama: c.fullName, nik: c.nik ?? "", alamat: c.address ?? "", kota: c.city ?? "", kewarganegaraan: "Indonesia" };
  const out: Person = { ...base };
  for (const [k, v] of Object.entries(c.ktp ?? {}) as [keyof Person, string | undefined][]) {
    // Data klien yang sudah diisi kantor diutamakan; KTP hanya mengisi yang kosong.
    if (v && !out[k]) out[k] = v;
  }
  return out;
}
