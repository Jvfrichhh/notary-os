import type { Block } from "./layout";
import type { DeedData, Person, SectionDef } from "./schema";

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
