/**
 * Verifikasi TARGET DATABASE sebelum menjalankan perintah tulis apa pun
 * (db push / migrate deploy / seed). Script ini 100% READ-ONLY.
 *
 *   npx tsx scripts/db-target.ts
 *
 * Menampilkan: host & nama database (tanpa password), apakah tabel-tabel
 * inti dan tabel baru `client_accounts` sudah ada, riwayat migrasi Prisma
 * yang tercatat, dan jumlah baris. Dari sini Anda bisa memastikan dengan
 * mata kepala sendiri bahwa yang akan disentuh adalah database PENGUJIAN.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function describe(urlVar: string): string {
  const raw = process.env[urlVar];
  if (!raw) return "(tidak diset)";
  try {
    const u = new URL(raw);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}  (user: ${u.username || "-"})`;
  } catch {
    return "(tidak valid)";
  }
}

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = ${name}
    ) AS "exists"`;
  return rows[0]?.exists ?? false;
}

async function count(table: string): Promise<number | null> {
  if (!(await tableExists(table))) return null;
  const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*)::bigint AS n FROM "${table}"`);
  return Number(rows[0]?.n ?? 0);
}

async function main() {
  console.log("DATABASE_URL :", describe("DATABASE_URL"));
  console.log("DIRECT_URL   :", describe("DIRECT_URL"));

  const [db, ver] = await Promise.all([
    prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`,
    prisma.$queryRaw<{ v: string }[]>`SELECT version() AS v`
  ]);
  console.log("current_database():", db[0]?.db);
  console.log("server:", ver[0]?.v?.split(",")[0]);

  console.log("\nTabel:");
  for (const t of ["users", "roles", "clients", "jobs", "documents", "client_accounts", "_prisma_migrations"]) {
    const n = await count(t);
    console.log(`  ${t.padEnd(20)} ${n === null ? "TIDAK ADA" : `ada, ${n} baris`}`);
  }

  if (await tableExists("_prisma_migrations")) {
    const rows = await prisma.$queryRaw<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`
      SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`;
    console.log("\nRiwayat migrasi Prisma tercatat:");
    rows.forEach((r) =>
      console.log(`  ${r.migration_name}  ${r.rolled_back_at ? "(rolled back)" : r.finished_at ? "applied" : "PENDING/FAILED"}`)
    );
  } else {
    console.log("\nRiwayat migrasi Prisma: tabel _prisma_migrations TIDAK ADA (skema pernah dibuat tanpa migrate).");
  }

  const users = await count("users");
  const clients = await count("clients");
  console.log(
    "\nKesimpulan:",
    users === null
      ? "database KOSONG (belum ada skema) -> aman untuk dibentuk sebagai DB pengujian."
      : users === 0 && clients === 0
        ? "skema ada tapi belum berisi data."
        : "database BERISI DATA -> pastikan ini BUKAN produksi sebelum perintah tulis apa pun."
  );
}

main()
  .catch((e) => {
    console.error("Gagal terhubung / membaca:", e?.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
