/**
 * Uji alur scripts/db-target.ts TANPA database: @prisma/client digantikan
 * stub (di folder sementara via NODE_PATH) yang mencatat pembuatan client dan
 * pemanggilan $disconnect(). Memeriksa exit code, pemanggilan disconnect di
 * jalur error, dan bahwa password tidak pernah tercetak.
 *
 *   node scripts/test-db-target.mjs        (butuh `tsx`: lokal via npx, atau global)
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PW = "RAHASIA-pw-777";
const REF = "abcdefghij1234567890";
const REF2 = "zyxwvutsrq0987654321";
const POOL = `postgresql://postgres.${REF}:${PW}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const DIR = `postgresql://postgres:${PW}@db.${REF}.supabase.co:5432/postgres`;
const DIR2 = `postgresql://postgres:${PW}@db.${REF2}.supabase.co:5432/postgres`;
const BADPOOL = `postgresql://postgres:${PW}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

const STUB = `
const MODE = process.env.STUB_MODE || "empty";
const URLSTR = process.env.DATABASE_URL || "";
class PrismaClient {
  constructor() { process.stderr.write("[stub] CREATED\\n"); }
  async $disconnect() { process.stderr.write("[stub] DISCONNECTED\\n"); }
  async $queryRaw(strings) {
    const q = Array.isArray(strings) ? strings.join("?") : String(strings);
    if (MODE === "fail") throw new Error("Can't reach database server at " + URLSTR + " (simulasi)");
    if (q.includes("information_schema.tables")) return [{ exists: MODE === "data" }];
    if (q.includes("current_database")) return [{ db: "stubdb" }];
    if (q.includes("version()")) return [{ v: "PostgreSQL 16.0 (stub), x" }];
    if (q.includes("_prisma_migrations")) return [{ migration_name: "20261018020000_client_portal_accounts", finished_at: new Date(), rolled_back_at: null }];
    return [];
  }
  async $queryRawUnsafe(sql) {
    if (MODE === "fail") throw new Error("fail");
    if (sql.includes('"users"')) return [{ n: 4n }];
    if (sql.includes('"clients"')) return [{ n: 2n }];
    return [{ n: 0n }];
  }
}
module.exports = { PrismaClient };
`;

const tmp = mkdtempSync(join(tmpdir(), "dbtarget-stub-"));
const stubDir = join(tmp, "node_modules", "@prisma", "client");
mkdirSync(stubDir, { recursive: true });
writeFileSync(join(stubDir, "package.json"), JSON.stringify({ name: "@prisma/client", version: "0.0.0-stub", main: "index.js" }));
writeFileSync(join(stubDir, "index.js"), STUB);

const tsxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
const cases = [
  { name: "A. tanpa env", env: {}, args: [], exit: 4, created: 0, disc: 0 },
  { name: "B. hanya DATABASE_URL", env: { DATABASE_URL: POOL }, args: [], exit: 4, created: 0, disc: 0 },
  { name: "C. DIRECT_URL tidak valid", env: { DATABASE_URL: POOL, DIRECT_URL: "bukan-url" }, args: [], exit: 4, created: 0, disc: 0 },
  { name: "D. pooler tanpa postgres.<ref>", env: { DATABASE_URL: BADPOOL, DIRECT_URL: DIR }, args: [], exit: 4, created: 0, disc: 0 },
  { name: "E. kedua URL project berbeda", env: { DATABASE_URL: POOL, DIRECT_URL: DIR2 }, args: [], exit: 5, created: 0, disc: 0 },
  { name: "F. --expect-ref tidak cocok", env: { DATABASE_URL: POOL, DIRECT_URL: DIR }, args: ["--expect-ref", REF2], exit: 6, created: 0, disc: 0 },
  { name: "G. --expect-ref tanpa nilai", env: { DATABASE_URL: POOL, DIRECT_URL: DIR }, args: ["--expect-ref"], exit: 6, created: 0, disc: 0 },
  { name: "H. cocok, tanpa --expect-ref -> belum terverifikasi", env: { DATABASE_URL: POOL, DIRECT_URL: DIR, STUB_MODE: "empty" }, args: [], exit: 3, created: 1, disc: 1 },
  { name: "I. cocok + --expect-ref, DB kosong", env: { DATABASE_URL: POOL, DIRECT_URL: DIR, STUB_MODE: "empty" }, args: ["--expect-ref", REF], exit: 0, created: 1, disc: 1 },
  { name: "J. cocok + --expect-ref, DB berisi data", env: { DATABASE_URL: POOL, DIRECT_URL: DIR, STUB_MODE: "data" }, args: ["--expect-ref", REF], exit: 0, created: 1, disc: 1 },
  { name: "K. cocok + --expect-ref, koneksi gagal (disconnect tetap, password diredaksi)", env: { DATABASE_URL: POOL, DIRECT_URL: DIR, STUB_MODE: "fail" }, args: ["--expect-ref", REF], exit: 7, created: 1, disc: 1 },
  { name: "L. --expect-ref huruf besar", env: { DATABASE_URL: POOL, DIRECT_URL: DIR, STUB_MODE: "empty" }, args: ["--expect-ref", REF.toUpperCase()], exit: 0, created: 1, disc: 1 }
];

let failed = 0;
try {
  for (const c of cases) {
    const res = spawnSync(tsxCmd, ["tsx", "scripts/db-target.ts", ...c.args], {
      env: { PATH: process.env.PATH, HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, NODE_PATH: join(tmp, "node_modules"), ...c.env },
      encoding: "utf8",
      timeout: 60000,
      shell: process.platform === "win32"
    });
    const out = (res.stdout ?? "") + (res.stderr ?? "");
    const created = (out.match(/\[stub\] CREATED/g) ?? []).length;
    const disc = (out.match(/\[stub\] DISCONNECTED/g) ?? []).length;
    const leak = out.includes(PW);
    const pass = res.status === c.exit && created === c.created && disc === c.disc && !leak;
    if (!pass) failed++;
    console.log(`${pass ? "✓" : "✗"} ${c.name}`);
    console.log(`    exit=${res.status} (harap ${c.exit})  client dibuat=${created}/${c.created}  disconnect=${disc}/${c.disc}  bocor-password=${leak ? "YA" : "tidak"}`);
    if (!pass) console.log(out.split("\n").map((l) => "    | " + l).join("\n"));
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(failed === 0 ? `\n✓ ${cases.length}/${cases.length} kasus db-target lolos.` : `\n✗ ${failed} kasus gagal.`);
process.exit(failed === 0 ? 0 : 1);
