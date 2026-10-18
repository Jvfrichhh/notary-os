/**
 * Validasi file migrasi portal terhadap SQL yang DIHASILKAN Prisma sendiri.
 * Tanpa koneksi database, tanpa tulisan apa pun (hanya membaca git & file).
 *
 *   node scripts/check-portal-migration.mjs
 *
 * Cara kerja:
 *  1. Ambil schema.prisma dari branch `main` (git show) -> model "sebelum".
 *  2. `prisma migrate diff --from-schema-datamodel <main> --to-schema-datamodel <sekarang> --script`
 *     -> SQL delta yang akan dibuat Prisma untuk perubahan model ini.
 *  3. Normalisasi (buang komentar, spasi) dan bandingkan statement-per-statement
 *     dengan GABUNGAN file migrasi portal (lihat MIGRATIONS).
 *
 * Exit 0 = identik secara statement; exit 1 = ada perbedaan (dicetak).
 * Butuh Prisma CLI (devDependency) -> jalankan setelah `npm install`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Semua migrasi portal (delta main -> sekarang = gabungan file-file ini).
const MIGRATIONS = [
  "prisma/migrations/20261018020000_client_portal_accounts/migration.sql",
  "prisma/migrations/20261018040000_client_portal_documents/migration.sql",
  "prisma/migrations/20261018060000_client_portal_password/migration.sql"
];
const BASE_REF = process.env.BASE_REF ?? "main";

function normalize(sql) {
  return sql
    .split("\n")
    .map((l) => l.replace(/--.*$/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .split(";")
    .map((st) => st.trim())
    .filter(Boolean)
    .map((st) => st.replace(/\s*\(\s*/g, "(").replace(/\s*\)\s*/g, ")").replace(/\s*,\s*/g, ","));
}

const tmp = mkdtempSync(join(tmpdir(), "notary-mig-"));
try {
  const baseSchema = execFileSync("git", ["show", `${BASE_REF}:prisma/schema.prisma`], { encoding: "utf8" });
  const basePath = join(tmp, "schema.base.prisma");
  writeFileSync(basePath, baseSchema);

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const expected = execFileSync(
    npx,
    ["prisma", "migrate", "diff", "--from-schema-datamodel", basePath, "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
  );
  const actual = MIGRATIONS.map((f) => readFileSync(f, "utf8")).join("\n");

  const exp = normalize(expected);
  const act = normalize(actual);

  console.log(`Prisma menghasilkan ${exp.length} statement; ${MIGRATIONS.length} file migrasi berisi ${act.length} statement.\n`);

  const missing = exp.filter((s) => !act.includes(s)); // ada di hasil Prisma, tidak ada di file
  const extra = act.filter((s) => !exp.includes(s)); // ada di file, tidak dihasilkan Prisma

  if (missing.length === 0 && extra.length === 0) {
    console.log("✓ IDENTIK: setiap statement (CREATE TABLE/INDEX/FK) di file migrasi sama dengan yang dihasilkan Prisma.");
    process.exit(0);
  }
  if (missing.length) {
    console.log("✗ Dihasilkan Prisma tetapi TIDAK ADA di file migrasi:");
    missing.forEach((s) => console.log("   - " + s));
  }
  if (extra.length) {
    console.log("✗ Ada di file migrasi tetapi TIDAK dihasilkan Prisma:");
    extra.forEach((s) => console.log("   - " + s));
  }
  console.log("\nSQL lengkap hasil Prisma (untuk referensi):\n" + expected);
  process.exit(1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
