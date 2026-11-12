/** Pilihan tetap yang dipakai form (client) -- dipisah dari katalog supaya bundle client tetap kecil. */

/** Jenis akta PPAT (bentuk perbuatan hukum) untuk Buku Daftar Akta PPAT. */
export const PPAT_DEED_TYPES = [
  "Jual Beli",
  "Hibah",
  "Tukar Menukar",
  "Pemasukan ke Dalam Perusahaan (Inbreng)",
  "Pembagian Hak Bersama",
  "Pemberian Hak Tanggungan (APHT)",
  "Surat Kuasa Membebankan Hak Tanggungan (SKMHT)",
  "Pemberian HGB/Hak Pakai atas Tanah Hak Milik"
] as const;

/** Pilihan jenis perubahan untuk Akta Perubahan PT (boleh lebih dari satu). */
export const PT_CHANGE_OPTIONS = [
  "Perubahan KBLI / maksud dan tujuan",
  "Perubahan Direksi",
  "Perubahan Dewan Komisaris",
  "Peralihan saham",
  "Perubahan modal",
  "Perubahan alamat / tempat kedudukan",
  "Perubahan nama perseroan"
] as const;
