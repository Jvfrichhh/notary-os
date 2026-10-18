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
 *     (butuh akses DB lewat DATABASE_URL untuk toggle flag -- dilewati jika
 *     tidak diset).
 *  9. Logout -> /portal/login.
 *
 * Butuh: playwright. Opsional: @prisma/client + DATABASE_URL untuk skenario 8.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "password123";
const CLIENT_A = "client@demo.local"; // CLI-0001, JOB-YYYY-0001
const CLIENT_B = "client2@demo.local"; // CLI-0002, JOB-YYYY-0002
const STAFF = "notary@demo.local";

let failures = 0;
function check(cond, msg) {
  console.log(`  ${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
}

async function portalLogin(page, email, password = PASSWORD) {
  await page.goto(`${BASE}/portal/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  if (page.url().includes("/portal/login")) return false;
  await page.waitForURL(/\/portal(\?|$)/, { timeout: 15000 });
  return true;
}

async function staffLogin(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/dashboard/, { timeout: 30000 }), page.click('button[type="submit"]')]);
}

const browser = await chromium.launch();

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
if (!process.env.DATABASE_URL) {
  console.log("  - dilewati (DATABASE_URL tidak diset)");
} else {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    // 8a: sesi aktif lalu akun dinonaktifkan -> ditendang
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await portalLogin(page, CLIENT_B);
    await prisma.clientAccount.update({ where: { email: CLIENT_B }, data: { isActive: false } });
    await page.goto(`${BASE}/portal`);
    check(page.url().includes("/portal/login?error=account_inactive"), "akun dinonaktifkan saat sesi aktif -> /portal/login?error=account_inactive");
    const ok = await portalLogin(page, CLIENT_B);
    check(!ok, "akun nonaktif tidak bisa login lagi");
    await prisma.clientAccount.update({ where: { email: CLIENT_B }, data: { isActive: true } });

    // 8b: klien diarsipkan
    await portalLogin(page, CLIENT_B);
    await prisma.client.update({ where: { clientNumber: "CLI-0002" }, data: { status: "ARCHIVED" } });
    await page.goto(`${BASE}/portal`);
    check(page.url().includes("/portal/login?error=client_inactive"), "klien diarsipkan saat sesi aktif -> /portal/login?error=client_inactive");
    await prisma.client.update({ where: { clientNumber: "CLI-0002" }, data: { status: "ACTIVE" } });
    await ctx.close();
  } finally {
    await prisma.$disconnect();
  }
}

await browser.close();
console.log(failures === 0 ? "\n✓ Semua uji portal lolos." : `\n✗ ${failures} uji gagal.`);
process.exit(failures === 0 ? 0 : 1);
