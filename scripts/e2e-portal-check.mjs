/**
 * Uji akses PORTAL KLIEN end-to-end terhadap server yang sudah hidup
 * (npm run dev / npm start) dan database PENGUJIAN yang sudah di-seed.
 *
 *   BASE_URL=http://localhost:3000 node scripts/e2e-portal-check.mjs
 *
 * Skenario:
 *  1. Tanpa login: /portal -> /portal/login; /portal/jobs/x -> /portal/login.
 *  2. Klien A login -> dashboard hanya memuat job milik A (JOB-...-0001),
 *     tidak memuat job milik B (JOB-...-0002).
 *  3. Klien A membuka URL detail job milik B -> 404 (bukan data B).
 *  4. Klien A membuka area internal (/dashboard, /clients, /jobs/<id B>)
 *     -> dialihkan ke /portal; /api/search -> 403.
 *  5. Klien A memanggil server action internal (createClient) langsung
 *     -> ditolak, tidak ada data tercipta.
 *  6. Staff (NOTARY) membuka /portal -> dialihkan ke /dashboard.
 *  7. Login portal dengan kredensial staff -> gagal (provider terpisah).
 *  8. Akun portal nonaktif / klien diarsipkan -> login ditolak, dan sesi yang
 *     sudah ada langsung ditendang ke /portal/login?error=...
 *     (butuh E2E_TEST_DATABASE_URL -- URL database PENGUJIAN -- untuk toggle
 *     flag; dilewati jika tidak diset).
 *  9. Logout -> /portal/login.
 *
 * Butuh: playwright. Opsional: @prisma/client + E2E_TEST_DATABASE_URL untuk skenario 8.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "password123";

import { assertSafeTarget, bindTestDatabase, portalLogin as portalLoginShared, describeDbUrl } from "./lib/e2e-guard.mjs";

// Lapis 1: pemeriksaan ENV (produksi ditolak mutlak; remote butuh izin +
// E2E_EXPECTED_DB_REF; E2E_TEST_DATABASE_URL harus cocok dengan ref itu).
const { testDbUrl } = assertSafeTarget(BASE);

let failures = 0;
function check(cond, msg) {
  console.log(`  ${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
}

const portalLogin = (page, email, password = PASSWORD) => portalLoginShared(page, BASE, email, password);

async function staffLogin(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/dashboard/, { timeout: 30000 }), page.click('button[type="submit"]')]);
}

// Import playwright SETELAH pengaman target di atas lolos.
const { chromium } = await import("playwright");
const browser = await chromium.launch();

// Lapis 2: pre-flight RUNTIME. Berhenti jika akun demo tidak bisa login di
// target, atau jika aplikasi ternyata memakai DB lain dari E2E_TEST_DATABASE_URL.
const testDb = await bindTestDatabase({ browser, baseUrl: BASE, testDbUrl });

// ---------------------------------------------------------------- 1
console.log("\n[1] Tanpa login");
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/portal`);
  check(page.url().includes("/portal/login"), "/portal -> /portal/login");
  await page.goto(`${BASE}/portal/jobs/apa-saja`);
  check(page.url().includes("/portal/login"), "/portal/jobs/<id> -> /portal/login");
  await ctx.close();
}

// Ambil id job milik B (dan A) lewat sesi B sendiri.
let jobIdB = null;
let jobIdA = null;
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const ok = await portalLogin(page, CLIENT_B);
  check(ok, "klien B bisa login");
  const hrefs = await page.$$eval('a[href^="/portal/jobs/"]', (as) => as.map((a) => a.getAttribute("href")));
  jobIdB = hrefs[0]?.split("/").pop() ?? null;
  check(!!jobIdB, `klien B melihat job miliknya (id: ${jobIdB ?? "-"})`);
  await ctx.close();
}

// ---------------------------------------------------------------- 2-5, 9
console.log("\n[2-5] Klien A");
let actionId = null;
{
  // ID server action createClient diambil dari halaman staff yang berhak.
  const sctx = await browser.newContext();
  const spage = await sctx.newPage();
  await staffLogin(spage, STAFF);
  await spage.goto(`${BASE}/clients/new`);
  const m = (await spage.content()).match(/\$ACTION_ID_([0-9a-f]+)/);
  actionId = m ? m[1] : null;
  check(!!actionId, "ID server action createClient ditemukan (untuk uji bypass)");

  // [6] staff ke /portal
  await spage.goto(`${BASE}/portal`);
  check(spage.url().includes("/dashboard"), "[6] staff membuka /portal -> dialihkan ke /dashboard");
  await sctx.close();
}
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const ok = await portalLogin(page, CLIENT_A);
  check(ok, "klien A bisa login");

  const body = await page.textContent("body");
  check(/JOB-\d{4}-0001/.test(body), "dashboard A memuat JOB-...-0001 (milik A)");
  check(!/JOB-\d{4}-0002/.test(body), "dashboard A TIDAK memuat JOB-...-0002 (milik B)");
  check(!/Siti Aminah/.test(body), "dashboard A tidak memuat nama klien B");
  const hrefs = await page.$$eval('a[href^="/portal/jobs/"]', (as) => as.map((a) => a.getAttribute("href")));
  jobIdA = hrefs[0]?.split("/").pop() ?? null;

  // detail milik sendiri
  if (jobIdA) {
    await page.goto(`${BASE}/portal/jobs/${jobIdA}`);
    const t = await page.textContent("body");
    check(/JOB-\d{4}-0001/.test(t) && /Dokumen yang Diperlukan/.test(t), "detail job A terbuka untuk A");
  }

  // [3] detail milik B
  if (jobIdB) {
    const res = await page.goto(`${BASE}/portal/jobs/${jobIdB}`);
    const t = await page.textContent("body");
    check(res.status() === 404, `A membuka job B -> HTTP 404 (dapat ${res.status()})`);
    check(!/JOB-\d{4}-0002/.test(t) && !/Depok/.test(t), "A membuka job B -> tidak ada data B di halaman");
  }

  // [4] area internal
  for (const p of ["/dashboard", "/clients", "/jobs", jobIdB ? `/jobs/${jobIdB}` : null].filter(Boolean)) {
    await page.goto(`${BASE}${p}`);
    check(new URL(page.url()).pathname === "/portal", `A membuka ${p} -> dialihkan ke /portal`);
  }
  const api = await ctx.request.get(`${BASE}/api/search?q=budi`, { maxRedirects: 0 });
  check(api.status() === 403, `A memanggil /api/search -> 403 (dapat ${api.status()})`);
  const dl = await ctx.request.get(`${BASE}/api/documents/x/download`, { maxRedirects: 0 });
  check(dl.status() === 403, `A memanggil /api/documents/*/download -> 403 (dapat ${dl.status()})`);

  // [5] server action internal
  if (actionId) {
    const probe = `PORTAL-BYPASS-${Date.now()}`;
    const res = await ctx.request.post(`${BASE}/clients/new`, {
      headers: { "Next-Action": actionId, Accept: "text/x-component" },
      multipart: { fullName: probe, clientType: "Individu", phone: "0800000000", [`$ACTION_ID_${actionId}`]: "" },
      maxRedirects: 0
    });
    const txt = await res.text();
    const created = /"clientNumber"|CLI-\d{4}/.test(txt);
    check(!created, `A memanggil server action createClient -> ditolak (status ${res.status()})`);
  }

  // [9] logout
  await page.goto(`${BASE}/portal`);
  await Promise.all([page.waitForURL(/\/portal\/login/, { timeout: 15000 }), page.click('button[title="Keluar"]')]);
  check(page.url().includes("/portal/login"), "logout -> /portal/login");
  await ctx.close();
}

// ---------------------------------------------------------------- 7
console.log("\n[7] Kredensial staff di portal");
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const ok = await portalLogin(page, STAFF);
  check(!ok, "login portal dengan akun staff -> ditolak");
  await ctx.close();
}

// ---------------------------------------------------------------- 8
console.log("\n[8] Akun nonaktif / klien diarsipkan");
// Satu-satunya skenario yang MENULIS ke database (toggle isActive / status
// klien). Hanya berjalan jika E2E_TEST_DATABASE_URL lolos lapis 1 dan 2.
// Nilai AWAL direkam sebelum perubahan apa pun dan dipulihkan apa adanya di
// `finally` -- bukan diasumsikan "aktif"/"ACTIVE". Kegagalan pemulihan
// dihitung sebagai kegagalan tes, bukan disamarkan.
if (!testDb) {
  console.log("  - dilewati (E2E_TEST_DATABASE_URL tidak diset)");
} else {
  console.log(`  - menulis ke: ${describeDbUrl(testDbUrl)}`);

  // Rekam nilai awal PERSIS record yang akan disentuh (hanya dua record ini).
  let acct0 = null;
  let client0 = null;
  try {
    [acct0, client0] = await Promise.all([
      testDb.clientAccount.findUnique({ where: { email: CLIENT_B }, select: { isActive: true } }),
      testDb.client.findUnique({ where: { clientNumber: "CLI-0002" }, select: { status: true } })
    ]);
  } catch (e) {
    await testDb.$disconnect().catch(() => {});
    throw e; // belum ada yang diubah; biarkan gagal dengan jelas
  }
  if (!acct0 || !client0) {
    check(false, `record uji tidak ditemukan (akun ${CLIENT_B}: ${!!acct0}, CLI-0002: ${!!client0}) -- skenario 8 dilewati`);
    await testDb.$disconnect();
  } else {
    console.log(`  - nilai awal: ${CLIENT_B}.isActive=${acct0.isActive}, CLI-0002.status=${client0.status}`);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      // 8a: sesi aktif lalu akun dinonaktifkan -> ditendang
      await portalLogin(page, CLIENT_B);
      await testDb.clientAccount.update({ where: { email: CLIENT_B }, data: { isActive: false } });
      await page.goto(`${BASE}/portal`);
      check(page.url().includes("/portal/login?error=account_inactive"), "akun dinonaktifkan saat sesi aktif -> /portal/login?error=account_inactive");
      const ok = await portalLogin(page, CLIENT_B);
      check(!ok, "akun nonaktif tidak bisa login lagi");
      await testDb.clientAccount.update({ where: { email: CLIENT_B }, data: { isActive: acct0.isActive } });

      // 8b: klien diarsipkan
      await portalLogin(page, CLIENT_B);
      await testDb.client.update({ where: { clientNumber: "CLI-0002" }, data: { status: "ARCHIVED" } });
      await page.goto(`${BASE}/portal`);
      check(page.url().includes("/portal/login?error=client_inactive"), "klien diarsipkan saat sesi aktif -> /portal/login?error=client_inactive");
    } finally {
      // Pemulihan TANPA SYARAT ke nilai awal yang direkam. updateMany: tidak
      // melempar jika record sudah tidak ada, dan where-nya tetap hanya dua
      // record ini.
      try {
        const r1 = await testDb.clientAccount.updateMany({ where: { email: CLIENT_B }, data: { isActive: acct0.isActive } });
        const r2 = await testDb.client.updateMany({ where: { clientNumber: "CLI-0002" }, data: { status: client0.status } });
        const [acct1, client1] = await Promise.all([
          testDb.clientAccount.findUnique({ where: { email: CLIENT_B }, select: { isActive: true } }),
          testDb.client.findUnique({ where: { clientNumber: "CLI-0002" }, select: { status: true } })
        ]);
        const restored = acct1?.isActive === acct0.isActive && client1?.status === client0.status;
        check(
          restored,
          `pemulihan nilai awal (${r1.count}+${r2.count} record): ${CLIENT_B}.isActive=${acct1?.isActive}, CLI-0002.status=${client1?.status}`
        );
      } catch (e) {
        failures++;
        console.error(`  ✗ PEMULIHAN GAGAL -- periksa manual: ${CLIENT_B}.isActive harus ${acct0.isActive}, CLI-0002.status harus ${client0.status}. Error: ${e?.message ?? e}`);
      } finally {
        await ctx.close().catch(() => {});
        await testDb.$disconnect().catch(() => {});
      }
    }
  }
}

await browser.close();
console.log(failures === 0 ? "\n✓ Semua uji portal lolos." : `\n✗ ${failures} uji gagal.`);
process.exit(failures === 0 ? 0 : 1);
