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
  client: { fullName: string; nik: string | null; address: string | null; city: string | null; companyName: string | null; clientType: string | null };
  job: { description: string | null };
}

/** Orang dari data klien (untuk prefill). */
export function personFromClient(c: PrefillContext["client"]): Person {
  return { nama: c.fullName, nik: c.nik ?? "", alamat: c.address ?? "", kota: c.city ?? "", kewarganegaraan: "Indonesia" };
}
