/**
 * Uji PENGAMAN LAPIS 1 (scripts/lib/e2e-guard.mjs) secara terisolasi:
 *  - tiap kasus = proses anak dengan environment BERSIH (hanya PATH + variabel kasus)
 *  - hanya memanggil assertSafeTarget(); TIDAK mengimpor Playwright, TIDAK
 *    membuka jaringan, TIDAK menyentuh Prisma/database
 *  - memeriksa exit code, potongan pesan, dan bahwa rahasia tidak tercetak
 *
 *   node scripts/test-e2e-guard.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const guardPath = resolve(here, "lib/e2e-guard.mjs");

const SECRET = "RAHASIA-XyZ987";
const PROD_APP = "https://notary-os-three.vercel.app";
const REMOTE_APP = "https://notary-os-git-feature-client-portal-contoh.vercel.app";
const LOCAL_APP = "http://localhost:3000";
const poolerUrl = (ref) => `postgresql://postgres.${ref}:${SECRET}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const directUrl = (ref) => `postgresql://postgres:${SECRET}@db.${ref}.supabase.co:5432/postgres`;
const localDbUrl = `postgresql://postgres:${SECRET}@localhost:5432/notary_test`;

// Proses anak: import modul guard lalu panggil assertSafeTarget(BASE_URL).
const runner = `
  const { assertSafeTarget } = await import(${JSON.stringify("file://" + guardPath)});
  const r = assertSafeTarget(process.env.BASE_URL);
  console.log("LAPIS1_LOLOS " + JSON.stringify({ isLocal: r.isLocal, expectedRef: r.expectedRef, hasTestDb: !!r.testDbUrl }));
`;

const cases = [
  {
    name: "1. Domain produksi + SEMUA flag aktif",
    env: { BASE_URL: PROD_APP, E2E_ALLOW_REMOTE: "1", E2E_EXPECTED_DB_REF: "testref123", E2E_TEST_DATABASE_URL: poolerUrl("testref123") },
    expectExit: 2,
    expectText: "domain PRODUKSI"
  },
  {
    name: "2. Remote tanpa E2E_ALLOW_REMOTE",
    env: { BASE_URL: REMOTE_APP, E2E_EXPECTED_DB_REF: "testref123" },
    expectExit: 2,
    expectText: "host non-lokal"
  },
  {
    name: "3. Remote + ALLOW, tanpa E2E_EXPECTED_DB_REF",
    env: { BASE_URL: REMOTE_APP, E2E_ALLOW_REMOTE: "1" },
    expectExit: 2,
    expectText: "butuh E2E_EXPECTED_DB_REF"
  },
  {
    name: "4a. Project-ref tidak cocok (pooler: username postgres.<ref>)",
    env: { BASE_URL: REMOTE_APP, E2E_ALLOW_REMOTE: "1", E2E_EXPECTED_DB_REF: "testref123", E2E_TEST_DATABASE_URL: poolerUrl("prodref999") },
    expectExit: 2,
    expectText: 'menunjuk project "prodref999"'
  },
  {
    name: "4b. Project-ref tidak cocok (direct: host db.<ref>)",
    env: { BASE_URL: LOCAL_APP, E2E_EXPECTED_DB_REF: "testref123", E2E_TEST_DATABASE_URL: directUrl("prodref999") },
    expectExit: 2,
    expectText: 'menunjuk project "prodref999"'
  },
  {
    name: "5. Target lokal, DB non-lokal tanpa ref disetujui",
    env: { BASE_URL: LOCAL_APP, E2E_TEST_DATABASE_URL: poolerUrl("prodref999") },
    expectExit: 2,
    expectText: "database non-lokal"
  },
  {
    name: "6a. Lokal valid (tanpa DB uji)",
    env: { BASE_URL: LOCAL_APP },
    expectExit: 0,
    expectText: '"isLocal":true'
  },
  {
    name: "6b. Lokal valid + DB uji lokal",
    env: { BASE_URL: LOCAL_APP, E2E_TEST_DATABASE_URL: localDbUrl },
    expectExit: 0,
    expectText: '"hasTestDb":true'
  },
  {
    name: "6c. Lokal + DB Supabase dengan ref disetujui yang cocok",
    env: { BASE_URL: LOCAL_APP, E2E_EXPECTED_DB_REF: "testref123", E2E_TEST_DATABASE_URL: directUrl("testref123") },
    expectExit: 0,
    expectText: '"expectedRef":"testref123"'
  },
  {
    name: "7. Remote valid: ALLOW + ref cocok (lolos lapis 1 SAJA)",
    env: { BASE_URL: REMOTE_APP, E2E_ALLOW_REMOTE: "1", E2E_EXPECTED_DB_REF: "testref123", E2E_TEST_DATABASE_URL: poolerUrl("testref123") },
    expectExit: 0,
    expectText: '"isLocal":false'
  },
  {
    name: "8. E2E_TEST_DATABASE_URL tidak valid",
    env: { BASE_URL: LOCAL_APP, E2E_TEST_DATABASE_URL: "bukan-url" },
    expectExit: 2,
    expectText: "tidak valid"
  },
  {
    name: "9. Ref disetujui ada, tapi DATABASE_URL aplikasi (bukan E2E_TEST_DATABASE_URL) menunjuk project lain -> harus DIABAIKAN",
    env: { BASE_URL: LOCAL_APP, E2E_EXPECTED_DB_REF: "testref123", DATABASE_URL: poolerUrl("prodref999"), DIRECT_URL: directUrl("prodref999") },
    expectExit: 0,
    expectText: "LAPIS1_LOLOS"
  }
];

let failed = 0;
for (const c of cases) {
  const res = spawnSync(process.execPath, ["--input-type=module", "-e", runner], {
    env: { PATH: process.env.PATH, ...c.env }, // environment bersih: tidak mewarisi .env/shell
    encoding: "utf8",
    timeout: 15000
  });
  const out = (res.stdout ?? "") + (res.stderr ?? "");
  const exitOk = res.status === c.expectExit;
  const textOk = out.includes(c.expectText);
  const leak = out.includes(SECRET) || /postgresql:\/\/[^\s]+:[^\s@]+@/.test(out);
  const pass = exitOk && textOk && !leak;
  if (!pass) failed++;
  console.log(`${pass ? "✓" : "✗"} ${c.name}`);
  console.log(`    exit=${res.status} (harap ${c.expectExit})  pesan=${textOk ? "sesuai" : "TIDAK sesuai"}  bocor-rahasia=${leak ? "YA" : "tidak"}`);
  if (!pass) console.log(out.split("\n").map((l) => "    | " + l).join("\n"));
}

console.log(failed === 0 ? `\n✓ ${cases.length}/${cases.length} kasus lapis 1 lolos.` : `\n✗ ${failed} kasus gagal.`);
process.exit(failed === 0 ? 0 : 1);
