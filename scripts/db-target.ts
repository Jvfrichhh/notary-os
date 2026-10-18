/**
 * Verifikasi TARGET DATABASE sebelum menjalankan perintah tulis apa pun
 * (db push / migrate deploy / seed). Script ini 100% READ-ONLY.
 *
 *   npx tsx scripts/db-target.ts --expect-ref <project-ref DB pengujian yang disetujui>
 *   npx tsx scripts/db-target.ts                 # hanya inspeksi; exit 3 (belum terverifikasi)
 *
 * Sumber yang dibaca: process.env.DATABASE_URL dan process.env.DIRECT_URL
 * (dari shell / .env yang dimuat Prisma). Tidak ada nilai rahasia yang dicetak:
 * hanya host:port/db, username, dan project-ref.
 *
 * Exit code (dipakai sebagai GERBANG: `db-target --expect-ref X && prisma db push`):
 *   0  ref DATABASE_URL = ref DIRECT_URL = --expect-ref, koneksi & inspeksi berhasil
 *   3  inspeksi berjalan tetapi --expect-ref TIDAK diberikan -> identitas BELUM diverifikasi
 *   4  DATABASE_URL / DIRECT_URL tidak diset atau tidak valid
 *   5  DATABASE_URL dan DIRECT_URL menunjuk project / database yang berbeda
 *   6  ref tidak cocok dengan --expect-ref
 *   7  koneksi / query gagal
 * Pada 4/5/6 TIDAK ada koneksi database yang dibuka.
 */
import { PrismaClient } from "@prisma/client";
// @ts-ignore -- modul JS tanpa deklarasi tipe; dipakai bersama e2e-guard.
import { compareIdentities, dbIdentity, describeDbUrl, redactSecrets } from "./lib/db-identity.mjs";

type Identity = { ref: string | null; source: string; host: string; port: string; database: string; isLocal: boolean } | null;

/** URL yang kita pegang -- hanya untuk meredaksi password dari pesan error. */
const KNOWN_URLS = [process.env.DATABASE_URL, process.env.DIRECT_URL].filter(Boolean) as string[];

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

function fail(code: number, msg: string): never {
  console.error(`\nDIHENTIKAN (exit ${code}): ${redactSecrets(msg, KNOWN_URLS)}`);
  process.exit(code);
}

async function inspect(expectRef: string | null): Promise<void> {
  const prisma = new PrismaClient();
  // Error koneksi/query ditampung di sini, BUKAN langsung process.exit di
  // dalam catch -- process.exit melewati `finally`, sehingga $disconnect()
  // tidak akan pernah jalan. Exit dilakukan SETELAH finally.
  let inspectError: unknown = null;
  try {
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

    const [db, ver] = await Promise.all([
      prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`,
      prisma.$queryRaw<{ v: string }[]>`SELECT version() AS v`
    ]);
    console.log("\ncurrent_database():", db[0]?.db);
    console.log("server            :", ver[0]?.v?.split(",")[0]);

    console.log("\nTabel:");
    const counts: Record<string, number | null> = {};
    for (const t of ["users", "roles", "clients", "jobs", "documents", "client_accounts", "_prisma_migrations"]) {
      counts[t] = await count(t);
      console.log(`  ${t.padEnd(20)} ${counts[t] === null ? "TIDAK ADA" : `ada, ${counts[t]} baris`}`);
    }

    if (counts["_prisma_migrations"] !== null) {
      const rows = await prisma.$queryRaw<
        { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
      >`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`;
      console.log("\nRiwayat migrasi Prisma tercatat:");
      if (rows.length === 0) console.log("  (tabel ada, kosong)");
      rows.forEach((r) =>
        console.log(`  ${r.migration_name}  ${r.rolled_back_at ? "(rolled back)" : r.finished_at ? "applied" : "PENDING/FAILED"}`)
      );
    } else {
      console.log("\nRiwayat migrasi Prisma: tabel _prisma_migrations TIDAK ADA (skema belum pernah dikelola migrate, atau DB kosong).");
    }

    const users = counts["users"];
    const clients = counts["clients"];
    console.log(
      "\nIsi:",
      users === null
        ? "database KOSONG (belum ada skema)."
        : users === 0 && clients === 0
          ? "skema ada tapi belum berisi data."
          : "database BERISI DATA."
    );
  } catch (e) {
    inspectError = e;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
  if (inspectError) {
    fail(7, `koneksi / query gagal: ${(inspectError as Error)?.message ?? String(inspectError)}`);
  }

  if (!expectRef) {
    fail(
      3,
      "inspeksi selesai, tetapi identitas target BELUM DIVERIFIKASI karena --expect-ref tidak diberikan.\n" +
        "Jalankan ulang dengan --expect-ref <project-ref DB pengujian yang disetujui>. Ketiadaan ref BUKAN izin untuk melanjutkan."
    );
  }
  console.log(`\n✓ Identitas terverifikasi: project-ref "${expectRef}" (DATABASE_URL = DIRECT_URL = --expect-ref).`);
  console.log("  Catatan: ini membuktikan URL menunjuk project yang Anda setujui; isi DB di atas yang menentukan apakah aman ditulis.");
}

async function main() {
  const expectRef = arg("--expect-ref");
  if (expectRef === "") fail(6, "--expect-ref diberikan tanpa nilai.");

  const dbUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  console.log("DATABASE_URL :", describeDbUrl(dbUrl));
  console.log("DIRECT_URL   :", describeDbUrl(directUrl));

  const a: Identity = dbIdentity(dbUrl);
  const b: Identity = dbIdentity(directUrl);
  if (!a) fail(4, "DATABASE_URL tidak diset atau bukan connection string PostgreSQL yang valid.");
  if (!b) fail(4, "DIRECT_URL tidak diset atau bukan connection string PostgreSQL yang valid (Prisma CLI memakainya untuk db push/migrate).");

  console.log(`ref DATABASE_URL : ${a!.ref ?? "TIDAK DAPAT DITENTUKAN"}  (${a!.source})`);
  console.log(`ref DIRECT_URL   : ${b!.ref ?? "TIDAK DAPAT DITENTUKAN"}  (${b!.source})`);
  if (!a!.ref) fail(4, `project-ref DATABASE_URL tidak dapat ditentukan (${a!.source}). Tidak ada koneksi yang dibuka.`);
  if (!b!.ref) fail(4, `project-ref DIRECT_URL tidak dapat ditentukan (${b!.source}). Tidak ada koneksi yang dibuka.`);

  const cmp = compareIdentities(dbUrl, directUrl);
  if (!cmp.same) fail(5, `DATABASE_URL dan DIRECT_URL TIDAK menunjuk target yang sama: ${cmp.reason}. Tidak ada koneksi yang dibuka.`);
  console.log("kecocokan        : DATABASE_URL = DIRECT_URL ✓");

  // --expect-ref harus cocok dengan KEDUA URL (eksplisit, bukan hanya salah satu).
  if (expectRef) {
    const want = expectRef.toLowerCase();
    if (a!.ref !== want || b!.ref !== want) {
      fail(6, `project-ref target adalah "${a!.ref}" / "${b!.ref}", bukan --expect-ref "${expectRef}". Tidak ada koneksi yang dibuka.`);
    }
  }
  if (expectRef) console.log(`--expect-ref     : "${expectRef}" cocok ✓ (lanjut inspeksi read-only)`);
  else console.log("--expect-ref     : (tidak diberikan) -> inspeksi tetap dijalankan, tetapi hasil akhir = BELUM TERVERIFIKASI");

  await inspect(expectRef);
}

main();
