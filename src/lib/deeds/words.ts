/**
 * Penulisan angka/tanggal/uang dalam huruf sesuai kebiasaan akta notaris:
 * angka ditulis dengan huruf diikuti angka dalam kurung.
 * File murni (tanpa import) supaya bisa diuji langsung dengan Node.
 */

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

/** 0 -> "nol", 21 -> "dua puluh satu", 1500000 -> "satu juta lima ratus ribu". */
export function terbilang(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "nol";
  const t = (x: number): string => {
    if (x < 12) return SATUAN[x];
    if (x < 20) return `${SATUAN[x - 10]} belas`;
    if (x < 100) return `${SATUAN[Math.floor(x / 10)]} puluh${x % 10 ? " " + SATUAN[x % 10] : ""}`;
    if (x < 200) return `seratus${x - 100 ? " " + t(x - 100) : ""}`;
    if (x < 1000) return `${SATUAN[Math.floor(x / 100)]} ratus${x % 100 ? " " + t(x % 100) : ""}`;
    if (x < 2000) return `seribu${x - 1000 ? " " + t(x - 1000) : ""}`;
    if (x < 1e6) return `${t(Math.floor(x / 1000))} ribu${x % 1000 ? " " + t(x % 1000) : ""}`;
    if (x < 1e9) return `${t(Math.floor(x / 1e6))} juta${x % 1e6 ? " " + t(x % 1e6) : ""}`;
    if (x < 1e12) return `${t(Math.floor(x / 1e9))} miliar${x % 1e9 ? " " + t(x % 1e9) : ""}`;
    return `${t(Math.floor(x / 1e12))} triliun${x % 1e12 ? " " + t(x % 1e12) : ""}`;
  };
  return t(n).replace(/\s+/g, " ").trim();
}

/** Angka per digit, mis. NIK "3271..." -> tetap angka (NIK tidak dieja). */
export function formatThousands(n: number): string {
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "Rp100.000.000,00 (seratus juta Rupiah)" */
export function rupiah(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n.replace(/[^\d]/g, "")) : Number(n ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "Rp[...] ([...] Rupiah)";
  return `Rp${formatThousands(v)},00 (${terbilang(v)} Rupiah)`;
}

/** "dua (2)"; pecahan: "lima puluh koma lima (50,5)". */
export function angka(n: number | string | null | undefined): string {
  const v = Number(typeof n === "string" ? n.replace(",", ".") : n);
  if (!Number.isFinite(v)) return "[...]";
  if (Number.isInteger(v)) return `${terbilang(v)} (${formatThousands(v)})`;
  const [int, frac] = String(v).split(".");
  const fracWords = frac.split("").map((d) => (d === "0" ? "nol" : terbilang(Number(d)))).join(" ");
  return `${terbilang(Number(int))} koma ${fracWords} (${formatThousands(Number(int))},${frac})`;
}

/**
 * Bagian waris: "1/4" -> "satu per empat (1/4)"; "1/4 (satu per empat)" juga
 * dibalik menjadi huruf dahulu. Teks lain dibiarkan apa adanya.
 */
export function pecahan(v: string | null | undefined): string {
  const s = (v ?? "").trim();
  const m = s.match(/^(\d+)\s*\/\s*(\d+)(?:\s*\(.*\))?$/);
  if (!m) return s;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!b) return s;
  return `${terbilang(a)} per ${terbilang(b)} (${a}/${b})`;
}

export const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
export const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function parseDate(iso: string | null | undefined): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** "21-10-2026" -> "dua puluh satu Oktober dua ribu dua puluh enam (21-10-2026)" */
export function tanggalHuruf(iso: string | null | undefined): string {
  const p = parseDate(iso);
  if (!p) return "[...]";
  const dd = String(p.d).padStart(2, "0");
  const mm = String(p.m).padStart(2, "0");
  return `${terbilang(p.d)} ${BULAN[p.m - 1]} ${terbilang(p.y)} (${dd}-${mm}-${p.y})`;
}

/** "21 Oktober 2026" (untuk tanggal yang cukup disebut dengan angka, mis. di kutipan dokumen). */
export function tanggalSingkat(iso: string | null | undefined): string {
  const p = parseDate(iso);
  if (!p) return "[...]";
  return `${p.d} ${BULAN[p.m - 1]} ${p.y}`;
}

export function hari(iso: string | null | undefined): string {
  const p = parseDate(iso);
  if (!p) return "[...]";
  return HARI[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
}

/** "10:30" -> "10.30 WIB (sepuluh lewat tiga puluh menit Waktu Indonesia Barat)" */
export function jamHuruf(hhmm: string | null | undefined): string {
  const m = /^(\d{1,2})[:.](\d{2})/.exec(hhmm ?? "");
  if (!m) return "[...] Waktu Indonesia Barat ([...] WIB)";
  const h = Number(m[1]);
  const mi = Number(m[2]);
  const words = mi === 0 ? `${terbilang(h)} tepat` : `${terbilang(h)} lewat ${terbilang(mi)} menit`;
  // Huruf dahulu, angka dalam kurung (gaya akta).
  return `${words} Waktu Indonesia Barat (${String(h).padStart(2, "0")}.${String(mi).padStart(2, "0")} WIB)`;
}

/** "001" -> "001", dipakai untuk RT/RW. Kosong -> placeholder. */
export function orBlank(v: string | null | undefined, blank = "[...]"): string {
  const s = (v ?? "").toString().trim();
  return s ? s : blank;
}
