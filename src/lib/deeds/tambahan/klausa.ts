import type { FieldDef } from "../schema";

/** Pembantu penulisan isian & klausul baku (murni data/fungsi tanpa import nilai). */
export const t = (key: string, label: string, placeholder?: string, wide = true): FieldDef => ({ kind: "text", key, label, placeholder, wide });
export const ta = (key: string, label: string, placeholder?: string, help?: string): FieldDef => ({ kind: "textarea", key, label, placeholder, help });
export const tgl = (key: string, label: string): FieldDef => ({ kind: "date", key, label });
export const rp = (key: string, label: string, help?: string): FieldDef => ({ kind: "money", key, label, help });
export const num = (key: string, label: string): FieldDef => ({ kind: "number", key, label });
export const sel = (key: string, label: string, options: string[]): FieldDef => ({ kind: "select", key, label, options, default: options[0], wide: true });

export const AHLI_WARIS = "Perjanjian ini tidak berakhir karena salah satu pihak meninggal dunia, tetapi berlaku turun-temurun dan harus dipenuhi oleh para ahli waris atau penerima hak dari masing-masing pihak.";
export const MUSYAWARAH = "Segala perselisihan yang timbul dari perjanjian ini diselesaikan terlebih dahulu secara musyawarah untuk mufakat; apabila tidak tercapai, para pihak menyelesaikannya melalui pengadilan di tempat kedudukan hukum yang dipilih dalam akta ini.";
export const biaya = (siapa: string) => `Biaya pembuatan akta ini dan biaya lainnya berkenaan dengan dibuatnya akta ini menjadi tanggungan dan harus dibayar oleh ${siapa}.`;
export const LALAI = "lewatnya waktu saja telah menjadi bukti yang sah dan cukup mengenai kelalaian tersebut, sehingga tidak diperlukan lagi teguran dengan surat juru sita atau surat lain semacam itu";
export const LEPAS_1266 = "Para pihak melepaskan ketentuan Pasal 1266 dan Pasal 1267 Kitab Undang-Undang Hukum Perdata, sepanjang ketentuan tersebut mensyaratkan putusan Hakim untuk batalnya suatu perjanjian.";

/** Isian data perseroan/badan yang berulang. */
export const dataBadan = (jenis: string): FieldDef[] => [
  t("nama", `Nama ${jenis} (tanpa kata '${jenis}')`, "SINAR MAJU SEJAHTERA", false),
  { kind: "text", key: "kedudukan", label: "Tempat kedudukan (Kota/Kabupaten)", default: "Kota Bogor" },
  ta("aktaPendirian", "Akta pendirian", "akta Nomor 12 tanggal 5 Maret 2020, yang dibuat di hadapan ..., Sarjana Hukum, Notaris di ..."),
  t("pengesahan", "Pengesahan / pendaftaran", "Keputusan Menteri Hukum Republik Indonesia Nomor AHU-... tanggal ..."),
  ta("perubahanTerakhir", "Perubahan terakhir (kosongkan bila belum pernah)", "akta Nomor ... tanggal ..., dibuat di hadapan ...")
];
export const PREMIS_BADAN = (jenis: string, sebut: string) =>
  `bahwa **${jenis.toUpperCase()} {nama:up}**, berkedudukan di {kedudukan}, didirikan dengan {aktaPendirian}<<, yang telah memperoleh pengesahan/pendaftaran berdasarkan {pengesahan}>><<, terakhir diubah dengan {perubahanTerakhir}>>; untuk selanjutnya disebut "${sebut}";`;
export const KUASA_RAPAT = "selaku kuasa berdasarkan keputusan rapat tersebut di bawah ini";
