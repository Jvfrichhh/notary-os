import { prisma } from "@/lib/prisma";
import { getJakartaYear } from "@/lib/format";

/**
 * JOB-2026-0001, JOB-2026-0002, ... (reset penomoran per tahun, berdasarkan
 * tahun kalender Asia/Jakarta -- bukan tahun UTC server -- supaya job yang
 * dibuat dini hari WIB di akhir/awal tahun tidak salah dapat prefix tahun).
 *
 * Kenapa bukan count()+1: kalau dua job dibuat hampir bersamaan,
 * dua request bisa saja membaca count yang sama sebelum salah satu
 * selesai insert -> jobNumber duplikat.
 *
 * Solusinya: satu statement atomik di level database. INSERT ... ON
 * CONFLICT DO UPDATE ... RETURNING dieksekusi Postgres sebagai satu
 * operasi yang tidak bisa diselingi transaksi lain (row lock otomatis
 * pada baris counter), jadi setiap pemanggilan pasti dapat angka
 * berikutnya yang unik meski dipanggil concurrent.
 */
export async function generateJobNumber(): Promise<string> {
  const year = getJakartaYear();

  const result = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO job_number_counters (year, value)
    VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET value = job_number_counters.value + 1
    RETURNING value
  `;

  const sequence = result[0].value;
  return `JOB-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Nomor urut Repertorium per tahun (kolom sequenceNumber di model
 * Repertorium, bukan format string seperti jobNumber). Pola atomik yang
 * sama persis dengan generateJobNumber di atas -- tabel counter terpisah
 * (repertorium_counters) karena penomorannya independen dari Job.
 */
export async function generateRepertoriumSequence(year: number): Promise<number> {
  const result = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO repertorium_counters (year, value)
    VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET value = repertorium_counters.value + 1
    RETURNING value
  `;

  return result[0].value;
}
