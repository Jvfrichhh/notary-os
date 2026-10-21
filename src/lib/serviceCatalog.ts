/**
 * Katalog jenis layanan kantor beserta checklist dokumen & tugas bawaan.
 *
 * SATU sumber kebenaran: dipakai untuk mengisi tabel service_types +
 * service_templates (scripts/service-catalog-sql.ts menghasilkan SQL
 * idempoten dari file ini), dan oleh form (pilihan jenis perubahan PT).
 * File ini sengaja tanpa import supaya aman di server, client, dan script.
 *
 * Checklist adalah dokumen yang LAZIM diminta; kantor bisa menambah/mengurangi
 * per job. `isRequired: false` = tergantung kasus.
 */

export interface CatalogItem {
  name: string;
  category: string;
  description: string;
  checklist: { label: string; isRequired?: boolean }[];
  tasks: string[];
  /** Kunci template draft akta (lib/deeds) bila tersedia. */
  deedKey?: string;
}

const BASE_TASKS = ["Verifikasi kelengkapan dokumen", "Siapkan draft akta", "Review draft oleh Notaris", "Jadwalkan penandatanganan"];

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

export const SERVICE_CATALOG: CatalogItem[] = [
  {
    name: "Akta Jual Beli",
    category: "Pertanahan",
    description: "Jual beli hak atas tanah/bangunan (dibuat selaku PPAT).",
    checklist: [
      { label: "KTP Penjual" },
      { label: "KTP Pembeli" },
      { label: "Kartu Keluarga" },
      { label: "Sertifikat" },
      { label: "SPPT/PBB" },
      { label: "Bukti BPHTB", isRequired: false }
    ],
    tasks: ["Verifikasi dokumen penjual", "Verifikasi dokumen pembeli", "Siapkan draft akta", "Jadwalkan penandatanganan"]
  },
  {
    name: "Akta Perjanjian Pengikatan Jual Beli",
    category: "Pertanahan",
    description: "PPJB atas tanah/bangunan sebelum AJB.",
    deedKey: "ppjb",
    checklist: [
      { label: "KTP Penjual" },
      { label: "KTP Pembeli" },
      { label: "Kartu Keluarga Penjual & Pembeli" },
      { label: "Buku Nikah / Akta Perkawinan (bila menikah)", isRequired: false },
      { label: "KTP Pasangan Penjual (persetujuan)", isRequired: false },
      { label: "NPWP Penjual & Pembeli" },
      { label: "Sertifikat Asli" },
      { label: "SPPT PBB Tahun Berjalan + Bukti Lunas" },
      { label: "Bukti Pembayaran Uang Muka", isRequired: false }
    ],
    tasks: ["Cek sertifikat ke BPN", ...BASE_TASKS]
  },
  {
    name: "Akta Waris",
    category: "Waris",
    description: "Keterangan hak waris / pembagian warisan.",
    deedKey: "waris",
    checklist: [
      { label: "Akta Kematian Pewaris" },
      { label: "KTP & KK Pewaris" },
      { label: "Buku Nikah / Akta Perkawinan Pewaris" },
      { label: "KTP Seluruh Ahli Waris" },
      { label: "KK Seluruh Ahli Waris" },
      { label: "Akta Kelahiran Ahli Waris" },
      { label: "Surat Keterangan Wasiat (Daftar Pusat Wasiat)" },
      { label: "Surat Pernyataan Ahli Waris", isRequired: false },
      { label: "Bukti Kepemilikan Harta Peninggalan", isRequired: false }
    ],
    tasks: ["Permohonan cek wasiat ke Daftar Pusat Wasiat", ...BASE_TASKS]
  },
  {
    name: "Akta Kuasa Waris",
    category: "Waris",
    description: "Kuasa dari para ahli waris kepada salah satu/pihak lain.",
    deedKey: "kuasa_waris",
    checklist: [
      { label: "KTP Pemberi Kuasa (para ahli waris)" },
      { label: "KTP Penerima Kuasa" },
      { label: "KK Para Pihak" },
      { label: "Akta / Surat Keterangan Waris" },
      { label: "Akta Kematian Pewaris" },
      { label: "Bukti Kepemilikan Objek (sertifikat dll.)", isRequired: false }
    ],
    tasks: BASE_TASKS
  },
  {
    name: "Akta Wasiat",
    category: "Waris",
    description: "Wasiat umum (openbaar testament).",
    deedKey: "wasiat",
    checklist: [
      { label: "KTP Pewasiat" },
      { label: "Kartu Keluarga Pewasiat" },
      { label: "Buku Nikah / Akta Perkawinan", isRequired: false },
      { label: "Data Penerima Wasiat (KTP/KK)" },
      { label: "Daftar & Bukti Harta yang Diwasiatkan", isRequired: false }
    ],
    tasks: [...BASE_TASKS, "Laporkan wasiat ke Daftar Pusat Wasiat (maks. 5 hari kerja bulan berikutnya)"]
  },
  {
    name: "Akta Perjanjian Sewa",
    category: "Perjanjian",
    description: "Sewa menyewa tanah, bangunan, atau barang.",
    deedKey: "sewa",
    checklist: [
      { label: "KTP Pihak yang Menyewakan" },
      { label: "KTP Penyewa" },
      { label: "Kartu Keluarga Para Pihak" },
      { label: "NPWP Para Pihak", isRequired: false },
      { label: "Bukti Kepemilikan Objek Sewa (sertifikat/IMB)" },
      { label: "SPPT PBB Tahun Berjalan", isRequired: false },
      { label: "Persetujuan Pasangan Pihak yang Menyewakan", isRequired: false },
      { label: "Akta Pendirian & SK (bila badan usaha)", isRequired: false }
    ],
    tasks: BASE_TASKS
  },
  {
    name: "Akta Perjanjian Pra Nikah",
    category: "Keluarga",
    description: "Perjanjian perkawinan sebelum perkawinan dilangsungkan.",
    deedKey: "pra_nikah",
    checklist: [
      { label: "KTP Calon Suami" },
      { label: "KTP Calon Istri" },
      { label: "Kartu Keluarga Kedua Pihak" },
      { label: "Akta Kelahiran Kedua Pihak" },
      { label: "NPWP", isRequired: false },
      { label: "Daftar Harta Bawaan Masing-masing", isRequired: false },
      { label: "Rencana Tanggal & Tempat Perkawinan" }
    ],
    tasks: [...BASE_TASKS, "Ingatkan pencatatan perjanjian di KUA/Dukcapil"]
  },
  {
    name: "Akta Perjanjian Pasca Nikah",
    category: "Keluarga",
    description: "Perjanjian perkawinan selama dalam ikatan perkawinan (Putusan MK 69/PUU-XIII/2015).",
    deedKey: "pasca_nikah",
    checklist: [
      { label: "KTP Suami" },
      { label: "KTP Istri" },
      { label: "Kartu Keluarga" },
      { label: "Buku Nikah / Akta Perkawinan" },
      { label: "NPWP", isRequired: false },
      { label: "Daftar Harta Bersama & Harta Bawaan", isRequired: false }
    ],
    tasks: [...BASE_TASKS, "Ingatkan pencatatan perjanjian di KUA/Dukcapil"]
  },
  {
    name: "Akta Jaminan Fidusia",
    category: "Jaminan",
    description: "Pembebanan jaminan fidusia atas benda bergerak.",
    deedKey: "fidusia",
    checklist: [
      { label: "KTP Pemberi Fidusia (Debitur)" },
      { label: "KTP Pasangan Debitur (persetujuan)", isRequired: false },
      { label: "Kartu Keluarga Debitur" },
      { label: "Perjanjian Kredit / Pokok" },
      { label: "Bukti Kepemilikan Objek (BPKB/Faktur/Invoice)" },
      { label: "Surat Kuasa Pembebanan Fidusia", isRequired: false },
      { label: "Akta Pendirian & SK (bila badan usaha)", isRequired: false }
    ],
    tasks: [...BASE_TASKS, "Pendaftaran Fidusia online (maks. 30 hari)"]
  },
  {
    name: "Akta Kerjasama Usaha",
    category: "Perjanjian",
    description: "Perjanjian kerja sama usaha antar pihak.",
    deedKey: "kerjasama_usaha",
    checklist: [
      { label: "KTP Para Pihak / Pengurus" },
      { label: "NPWP Para Pihak" },
      { label: "Akta Pendirian & Perubahan Terakhir (bila badan usaha)", isRequired: false },
      { label: "SK Kemenkumham (bila badan hukum)", isRequired: false },
      { label: "NIB", isRequired: false },
      { label: "Pokok-pokok Kerja Sama (term sheet)" }
    ],
    tasks: BASE_TASKS
  },
  {
    name: "Akta Kerjasama Investasi",
    category: "Perjanjian",
    description: "Perjanjian penanaman modal / investasi antar pihak.",
    deedKey: "kerjasama_investasi",
    checklist: [
      { label: "KTP Investor & Pengelola" },
      { label: "NPWP Para Pihak" },
      { label: "Akta Pendirian & Perubahan Terakhir (bila badan usaha)", isRequired: false },
      { label: "SK Kemenkumham (bila badan hukum)", isRequired: false },
      { label: "Pokok-pokok Investasi (nilai, jangka waktu, bagi hasil)" },
      { label: "Rekening Penerima Dana", isRequired: false }
    ],
    tasks: BASE_TASKS
  },
  {
    name: "Akta Kuasa",
    category: "Kuasa",
    description: "Pemberian kuasa umum/khusus.",
    deedKey: "kuasa",
    checklist: [
      { label: "KTP Pemberi Kuasa" },
      { label: "KTP Penerima Kuasa" },
      { label: "Kartu Keluarga Pemberi Kuasa" },
      { label: "Dokumen Objek yang Dikuasakan", isRequired: false }
    ],
    tasks: BASE_TASKS
  },
  {
    name: "Akta Kuasa Jual",
    category: "Kuasa",
    description: "Kuasa untuk menjual tanah/bangunan atau benda lain.",
    deedKey: "kuasa_jual",
    checklist: [
      { label: "KTP Pemberi Kuasa" },
      { label: "KTP Penerima Kuasa" },
      { label: "Kartu Keluarga Pemberi Kuasa" },
      { label: "Buku Nikah & KTP Pasangan (persetujuan)", isRequired: false },
      { label: "Sertifikat / Bukti Kepemilikan Objek" },
      { label: "SPPT PBB Tahun Berjalan", isRequired: false }
    ],
    tasks: BASE_TASKS
  },
  {
    name: "Akta Pendirian PT",
    category: "Korporasi",
    description: "Pendirian Perseroan Terbatas.",
    deedKey: "pendirian_pt",
    checklist: [
      { label: "KTP Seluruh Pendiri / Pemegang Saham" },
      { label: "NPWP Seluruh Pendiri / Pemegang Saham" },
      { label: "KTP & NPWP Direksi dan Komisaris" },
      { label: "Usulan Nama PT (3 alternatif)" },
      { label: "Alamat Lengkap Kedudukan PT" },
      { label: "Bidang Usaha / KBLI" },
      { label: "Modal Dasar, Disetor, dan Komposisi Saham" },
      { label: "Nomor HP & Email PT" }
    ],
    tasks: ["Pemesanan nama PT di AHU", ...BASE_TASKS, "Pengesahan badan hukum melalui SABH", "Pendaftaran NIB di OSS"]
  },
  {
    name: "Akta Perubahan PT",
    category: "Korporasi",
    description: "Perubahan anggaran dasar/data PT berdasarkan keputusan RUPS (KBLI, Direksi, Komisaris, saham, dll.).",
    deedKey: "perubahan_pt",
    checklist: [
      { label: "Akta Pendirian & Seluruh Akta Perubahan" },
      { label: "SK Kemenkumham Pendirian & Perubahan" },
      { label: "NPWP & NIB Perseroan" },
      { label: "KTP & NPWP Pemegang Saham, Direksi, Komisaris" },
      { label: "Risalah RUPS / Keputusan Sirkuler Pemegang Saham" },
      { label: "Daftar Hadir RUPS", isRequired: false },
      { label: "KTP & NPWP Pengurus/Pemegang Saham Baru", isRequired: false },
      { label: "Daftar KBLI Baru", isRequired: false }
    ],
    tasks: [...BASE_TASKS, "Persetujuan/pemberitahuan perubahan melalui SABH", "Pembaruan data NIB di OSS"]
  },
  {
    name: "Akta Peralihan Saham",
    category: "Korporasi",
    description: "Jual beli / pengalihan saham PT.",
    deedKey: "peralihan_saham",
    checklist: [
      { label: "Akta Pendirian & Perubahan Terakhir + SK Kemenkumham" },
      { label: "KTP & NPWP Penjual Saham" },
      { label: "KTP & NPWP Pembeli Saham" },
      { label: "Persetujuan Pasangan Penjual", isRequired: false },
      { label: "Persetujuan RUPS / Bukti Penawaran ke Pemegang Saham Lain" },
      { label: "Daftar Pemegang Saham Terakhir" },
      { label: "Bukti Pembayaran Harga Saham", isRequired: false }
    ],
    tasks: [...BASE_TASKS, "Pemberitahuan perubahan pemegang saham melalui SABH"]
  }
];
