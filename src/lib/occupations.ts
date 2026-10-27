/**
 * Daftar pekerjaan/profesi mengikuti pilihan kolom "Pekerjaan" pada KTP
 * (Permendagri), diringkas ke yang lazim dijumpai di kantor notaris. Isian
 * tetap bebas: pengguna boleh mengetik yang tidak ada di daftar.
 */
export const OCCUPATION_OPTIONS = [
  "Belum/Tidak Bekerja",
  "Mengurus Rumah Tangga",
  "Pelajar/Mahasiswa",
  "Pensiunan",
  "Pegawai Negeri Sipil",
  "Tentara Nasional Indonesia",
  "Kepolisian RI",
  "Karyawan Swasta",
  "Karyawan BUMN",
  "Karyawan BUMD",
  "Karyawan Honorer",
  "Wiraswasta",
  "Perdagangan",
  "Petani/Pekebun",
  "Peternak",
  "Nelayan/Perikanan",
  "Buruh Harian Lepas",
  "Buruh Tani/Perkebunan",
  "Pembantu Rumah Tangga",
  "Sopir",
  "Guru",
  "Dosen",
  "Dokter",
  "Bidan",
  "Perawat",
  "Apoteker",
  "Pengacara",
  "Notaris",
  "Arsitek",
  "Akuntan",
  "Konsultan",
  "Wartawan",
  "Seniman",
  "Ustadz/Mubaligh",
  "Pendeta",
  "Pastor",
  "Anggota DPR/DPRD",
  "Kepala Desa",
  "Perangkat Desa",
  "Lainnya"
] as const;

/** Nama pekerjaan yang dipakai untuk mengelompokkan di laporan (rapikan ejaan/kapital). */
export function normalizeOccupation(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!v) return "Belum diisi";
  const hit = OCCUPATION_OPTIONS.find((o) => o.toLowerCase() === v.toLowerCase());
  if (hit) return hit;
  // Sinonim yang sering ditulis berbeda.
  const low = v.toLowerCase();
  if (/^(pns|asn)$/.test(low)) return "Pegawai Negeri Sipil";
  if (/^(tni)$/.test(low)) return "Tentara Nasional Indonesia";
  if (/^(polri|polisi)$/.test(low)) return "Kepolisian RI";
  if (/^(irt|ibu rumah tangga)$/.test(low)) return "Mengurus Rumah Tangga";
  if (/^(mahasiswa|pelajar|siswa)$/.test(low)) return "Pelajar/Mahasiswa";
  if (/^(pengangguran|tidak bekerja|belum bekerja)$/.test(low)) return "Belum/Tidak Bekerja";
  if (/^(swasta|pegawai swasta|karyawan)$/.test(low)) return "Karyawan Swasta";
  if (/^(pedagang|dagang)$/.test(low)) return "Perdagangan";
  if (/^(wirausaha|pengusaha)$/.test(low)) return "Wiraswasta";
  return v.replace(/\b\w/g, (c) => c.toUpperCase());
}
