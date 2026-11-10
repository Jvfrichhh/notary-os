/**
 * Usulan nomor berikutnya untuk daftar Legalisasi / Waarmerking / Protes.
 * Nomor urut berjalan per tahun; bentuk nomor mengikuti catatan terakhir
 * tahun itu (mis. "12/L/XI/2026" -> "13/L/XI/2026", bulan & tahun disesuaikan).
 * Belum ada catatan -> "1/<kode>/<bulan romawi>/<tahun>".
 */
const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function suggestRecordNumber(existing: string[], code: string, today: Date): string {
  const year = today.getUTCFullYear();
  const tail = `/${ROMAWI[today.getUTCMonth()]}/${year}`;
  let max = 0;
  let pattern: string | null = null;
  for (const n of existing) {
    const m = /^(\d{1,6})(.*)$/.exec(n.trim());
    if (!m) continue;
    const seq = Number(m[1]);
    if (seq > max) {
      max = seq;
      pattern = m[2];
    }
  }
  const next = max + 1;
  if (pattern === null) return `${next}/${code}${tail}`;
  // Akhiran "/<romawi>/<tahun>" disegarkan ke bulan & tahun sekarang; bagian lain dipertahankan.
  const refreshed = pattern.replace(/\/(?:[IVX]{1,4})\/\d{4}$/, tail);
  return `${next}${refreshed}`;
}

/** Awal & akhir tahun (UTC) dari sebuah tanggal, untuk mengambil catatan tahun berjalan. */
export function yearRange(d: Date): { gte: Date; lt: Date } {
  return { gte: new Date(Date.UTC(d.getUTCFullYear(), 0, 1)), lt: new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1)) };
}
