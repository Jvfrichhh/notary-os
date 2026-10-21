import type { FieldDef } from "./schema";
import type { DeedData } from "./schema";
import { str } from "./common";
import { angka, orBlank, tanggalHuruf } from "./words";

/** Isian objek tanah/bangunan (dipakai PPJB, Kuasa Jual, Sewa, AJB). */
export const LAND_FIELDS: FieldDef[] = [
  { kind: "select", key: "jenisHak", label: "Jenis hak", options: ["Hak Milik", "Hak Guna Bangunan", "Hak Pakai", "Hak Milik Atas Satuan Rumah Susun"], default: "Hak Milik" },
  { kind: "text", key: "nomorSertipikat", label: "Nomor sertipikat", placeholder: "mis. 123/Babakan" },
  { kind: "text", key: "nib", label: "NIB", placeholder: "10.08.03.02.01234" },
  { kind: "text", key: "suratUkur", label: "Surat Ukur/Gambar Situasi nomor", placeholder: "00123/Babakan/2010" },
  { kind: "date", key: "tanggalSuratUkur", label: "Tanggal surat ukur" },
  { kind: "number", key: "luas", label: "Luas tanah (m²)" },
  { kind: "text", key: "atasNama", label: "Tercatat atas nama" },
  { kind: "text", key: "letakAlamat", label: "Terletak di (jalan/nomor)", wide: true },
  { kind: "text", key: "letakKelurahan", label: "Kelurahan/Desa (lengkap)", placeholder: "Kelurahan Babakan" },
  { kind: "text", key: "letakKecamatan", label: "Kecamatan" },
  { kind: "text", key: "letakKota", label: "Kota/Kabupaten (lengkap)", placeholder: "Kota Bogor" },
  { kind: "text", key: "letakProvinsi", label: "Provinsi", default: "Jawa Barat" },
  { kind: "text", key: "nop", label: "NOP SPPT PBB" },
  { kind: "text", key: "bangunan", label: "Bangunan di atasnya (bila ada)", placeholder: "rumah tinggal permanen", wide: true }
];

/** Uraian objek: "sebidang tanah Hak Milik Nomor ..., berikut bangunan ...". */
export function uraianTanah(d: DeedData): string {
  const luas = Number(str(d.luas));
  const bangunan = str(d.bangunan);
  return [
    `sebidang tanah ${str(d.jenisHak) || "Hak Milik"} Nomor ${orBlank(str(d.nomorSertipikat))}`,
    `Nomor Identifikasi Bidang Tanah (NIB) ${orBlank(str(d.nib))}`,
    `sebagaimana diuraikan dalam Surat Ukur Nomor ${orBlank(str(d.suratUkur))} tanggal ${tanggalHuruf(str(d.tanggalSuratUkur))}`,
    `seluas ${Number.isFinite(luas) && luas > 0 ? angka(luas) : "[...]"} meter persegi`,
    `tercatat atas nama **${orBlank(str(d.atasNama)).toUpperCase()}**`,
    `terletak di Provinsi ${orBlank(str(d.letakProvinsi))}, ${orBlank(str(d.letakKota))}, Kecamatan ${orBlank(str(d.letakKecamatan))}, ${orBlank(str(d.letakKelurahan))}, setempat dikenal sebagai ${orBlank(str(d.letakAlamat))}`,
    `dengan Nomor Objek Pajak (NOP) ${orBlank(str(d.nop))}`,
    bangunan ? `berikut ${bangunan} yang berdiri di atasnya` : ""
  ]
    .filter(Boolean)
    .join(", ");
}
