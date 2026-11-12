import type { SectionDef } from "../schema";

/**
 * Template akta deklaratif: isi akta ditulis sebagai data (teks dengan
 * penanda {isian}), lalu dirakit oleh build.ts. File data sengaja tanpa
 * import nilai supaya bisa dipakai juga oleh katalog layanan.
 *
 * Penanda dalam teks:
 *   {kunci}        isi apa adanya ("[...]" bila kosong)
 *   {kunci:rp}     rupiah dengan huruf      {kunci:tgl}  tanggal dengan huruf
 *   {kunci:angka}  angka dengan huruf       {kunci:up}   huruf besar
 *   <<...>>        bagian opsional: dibuang bila ada penanda di dalamnya yang kosong
 */
export type Isi =
  | string
  | { j: string }
  | { b: string[] }
  | { baris: string }
  | { jika: string; maka: Isi[] };

export interface Pihak {
  key: string;
  /** Sebutan dalam akta, mis. "Pihak Pertama". Kosong = tidak diberi sebutan. */
  sebut: string;
  /** Judul bagian form, mis. "Pihak Pertama (Penjual)". */
  label: string;
  min?: number;
  max?: number;
  /** Tambahkan isian suami/istri yang memberi persetujuan. */
  pasangan?: boolean;
  /** Diisi otomatis dari data klien. */
  klien?: boolean;
}

export interface Cfg {
  key: string;
  title: string;
  /** Judul akta (huruf besar). */
  judul: string;
  /** Baris kedua judul (boleh memakai penanda). */
  sub?: string;
  category: string;
  description: string;
  pihak: Pihak[];
  sections: SectionDef[];
  /** Butir "bahwa ..." sebelum pasal. */
  premis?: Isi[];
  /** Kalimat pengantar sebelum pasal-pasal. */
  pengantar?: string;
  pasal: (Isi[] | { jika: string; isi: Isi[] })[];
  /** Penutup khusus akta wasiat (Pasal 938-939 KUHPerdata). */
  wasiat?: boolean;
  /** Masuk register Wasiat & laporan Daftar Pusat Wasiat saat disahkan. */
  lapor?: boolean;
  tanpaDomisili?: boolean;
  /** Akta relaas/pernyataan: isi ditulis sebagai alinea biasa tanpa judul "Pasal". */
  tanpaPasal?: boolean;
  subject: string;
  notes: string[];
  /** Dokumen yang lazim diminta; awali "?" bila tergantung kasus. */
  checklist: string[];
  tasks?: string[];
  duty?: { title: string; days: number; basis: string }[];
}
