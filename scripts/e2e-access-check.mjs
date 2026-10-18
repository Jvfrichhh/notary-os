/**
 * Uji akses end-to-end per role, dijalankan terhadap server yang sudah hidup
 * (npm run dev / npm start) dan database yang sudah di-seed (npm run prisma:seed).
 *
 *   BASE_URL=http://localhost:3000 node scripts/e2e-access-check.mjs
 *
 * Yang diperiksa untuk tiap role demo:
 *  1. Login berhasil & sidebar hanya memuat menu yang diizinkan.
 *  2. URL halaman terlarang dialihkan ke /dashboard?denied=1 (bukan tampil).
 *  3. API /api/search menolak tanpa login (401).
 *  4. VIEWER tidak bisa membuat client lewat Server Action yang dipanggil
 *     langsung (bypass UI) -- jumlah client di DB harus tetap.
 *  5. Logout mengembalikan ke /login.
 *
 * Butuh: playwright (dipakai dari instalasi global/lokal).
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "password123";

const ROLES = {
  NOTARY: { email: "notary@demo.local", forbidden: [] },
  ADMIN: { email: "admin@demo.local", forbidden: ["/admin", "/archive/minuta/new", "/notary-record/new"] },
  STAFF: {
    email: "staff@demo.local",
    forbidden: ["/admin", "/archive", "/notary-record", "/legalisasi", "/waarmerking", "/wasiat", "/payments", "/clients/1/edit"]
  },
  VIEWER: {
    email: "viewer@demo.local",
    forbidden: ["/admin", "/clients/new", "/jobs/new", "/visits/new", "/documents/new", "/payments/new", "/archive/deed/new", "/legalisasi/new", "/wasiat/new"]
  }
};

const EXPECTED_HIDDEN = {
  NOTARY: [],
  ADMIN: ["/admin"],
  STAFF: ["/archive", "/notary-record", "/legalisasi", "/waarmerking", "/wasiat", "/payments", "/admin"],
  VIEWER: ["/admin"]
};

let failures = 0;
function check(cond, msg) {
  console.log(`  ${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
}

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/dashboard/, { timeout: 30000 }), page.click('button[type="submit"]')]);
}

async function sidebarLinks(page) {
  return page.$$eval("aside nav a", (as) => as.map((a) => new URL(a.href).pathname));
}

const browser = await chromium.launch();

// --- API tanpa login ---
console.log("\n[Tanpa login]");
{
  const ctx = await browser.newContext();
  const res = await ctx.request.get(`${BASE}/api/search?q=budi`, { maxRedirects: 0 });
  check(res.status() === 401, `/api/search tanpa login -> 401 (dapat ${res.status()})`);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/clients`);
  check(page.url().includes("/login"), `/clients tanpa login dialihkan ke /login`);
  await ctx.close();
}

let viewerClientActionId = null;
let notaryCtx = null;

for (const [role, cfg] of Object.entries(ROLES)) {
  console.log(`\n[${role}] ${cfg.email}`);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, cfg.email);
  check(page.url().includes("/dashboard"), "login berhasil -> /dashboard");

  const links = await sidebarLinks(page);
  console.log(`  menu: ${links.join(", ")}`);
  for (const hidden of EXPECTED_HIDDEN[role]) {
    check(!links.includes(hidden), `menu ${hidden} tidak tampil`);
  }
  // Setiap menu yang tampil harus bisa dibuka tanpa dialihkan.
  for (const href of links) {
    await page.goto(`${BASE}${href}`);
    check(!page.url().includes("denied=1"), `menu ${href} bisa dibuka`);
  }
  for (const href of cfg.forbidden) {
    await page.goto(`${BASE}${href}`);
    check(page.url().includes("/dashboard?denied=1"), `URL terlarang ${href} -> /dashboard?denied=1`);
  }

  if (role === "NOTARY") {
    // Ambil ID server action createClient dari form Notaris (yang berhak)
    // untuk nanti dipakai VIEWER sebagai percobaan bypass.
    await page.goto(`${BASE}/clients/new`);
    const html = await page.content();
    const m = html.match(/\$ACTION_ID_([0-9a-f]+)/);
    viewerClientActionId = m ? m[1] : null;
    check(!!viewerClientActionId, "ID server action createClient ditemukan untuk uji bypass");
    notaryCtx = ctx; // simpan untuk hitung client via /api/search nanti
  }

  if (role === "VIEWER" && viewerClientActionId) {
    const probeName = `BYPASS-TEST-${Date.now()}`;
    const form = new FormData();
    form.append(`$ACTION_ID_${viewerClientActionId}`, "");
    form.append("fullName", probeName);
    form.append("clientType", "Individu");
    form.append("phone", "0800000000");
    const res = await ctx.request.post(`${BASE}/clients/new`, {
      headers: { "Next-Action": viewerClientActionId, Accept: "text/x-component" },
      multipart: { fullName: probeName, clientType: "Individu", phone: "0800000000", [`$ACTION_ID_${viewerClientActionId}`]: "" },
      maxRedirects: 0
    });
    const body = await res.text();
    const created = /"clientNumber"|CLI-\d{4}/.test(body) && !/PermissionError|tidak memiliki akses/.test(body);
    check(!created, `VIEWER memanggil server action createClient langsung -> ditolak (status ${res.status()})`);
    // Verifikasi lewat pencarian sebagai Notaris: nama probe tidak boleh ada.
    const search = await notaryCtx.request.get(`${BASE}/api/search?q=${encodeURIComponent("BYPASS-TEST")}`);
    const json = await search.json();
    const found = (json.groups ?? []).some((g) => g.items.some((i) => i.title.includes("BYPASS-TEST")));
    check(!found, "tidak ada client BYPASS-TEST yang tercipta di database");
  }

  // Logout
  await page.goto(`${BASE}/dashboard`);
  await Promise.all([page.waitForURL(/\/login/, { timeout: 15000 }), page.click('button[title="Keluar"]')]);
  check(page.url().includes("/login"), "logout -> /login");
  if (ctx !== notaryCtx) await ctx.close();
}
if (notaryCtx) await notaryCtx.close();
await browser.close();

console.log(failures === 0 ? "\n✓ Semua uji akses lolos." : `\n✗ ${failures} uji gagal.`);
process.exit(failures === 0 ? 0 : 1);
