/**
 * Pembanding nama klien untuk mencegah data ganda: huruf besar/kecil, sapaan,
 * gelar, bentuk badan usaha, dan tanda baca diabaikan.
 * "Tn. H. Budi Santoso, S.H." dan "budi santoso" dianggap nama yang sama.
 */
const AWALAN = new Set([
  "tuan", "tn", "nyonya", "ny", "nona", "nn", "bapak", "bpk", "pak", "ibu", "bu", "sdr", "sdri", "saudara", "saudari",
  "h", "hj", "haji", "hajjah", "dr", "drs", "dra", "drg", "ir", "prof", "kh",
  "pt", "cv", "ud", "fa", "firma", "yayasan", "perkumpulan", "koperasi"
]);

export function normalizeClientName(nama: string): string {
  // Gelar di belakang koma (", S.H., M.Kn.") tidak ikut dibandingkan.
  const tanpaGelar = nama.split(",")[0] ?? "";
  const kata = tanpaGelar
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  while (kata.length > 1 && AWALAN.has(kata[0])) kata.shift();
  // "Tbk" di belakang nama perseroan.
  if (kata.length > 1 && kata[kata.length - 1] === "tbk") kata.pop();
  return kata.join(" ");
}
