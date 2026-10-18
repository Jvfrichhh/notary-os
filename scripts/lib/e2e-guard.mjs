/**
 * Pengaman bersama untuk script E2E. Tujuannya satu: pengujian TIDAK PERNAH
 * bisa menyasar produksi, baik secara sengaja maupun tidak sengaja.
 *
 * Dua lapis:
 *  1) assertSafeTarget()   — pemeriksaan ENV sebelum apa pun berjalan
 *     (tanpa jaringan, tanpa browser).
 *  2) bindTestDatabase()   — pemeriksaan RUNTIME: membuktikan aplikasi di
 *     BASE_URL memakai database yang sama dengan E2E_TEST_DATABASE_URL,
 *     tanpa script ini menulis apa pun (yang menulis adalah aplikasi saat
 *     login: kolom lastLoginAt).
 *
 * Tidak ada fungsi di sini yang mencetak password atau connection string utuh.
 */

export const PRODUCTION_APP_HOSTS = ["notary-os-three.vercel.app"];
export const DEMO_PASSWORD = "password123";
export const DEMO_CLIENT_A = "client@demo.local";

/** host:port/db + user, tanpa password. Aman dicetak. */
export function describeDbUrl(raw) {
  try {
    const u = new URL(raw);
    return `${u.hostname}:${u.port || "5432"}${u.pathname} (user: ${u.username || "-"})`;
  } catch {
    return "(URL tidak valid)";
  }
}

/**
 * Identitas project database dari URL, tanpa password:
 *  - Supabase pooler : username "postgres.<ref>"  -> ref
 *  - Supabase direct : host "db.<ref>.supabase.co" -> ref
 *  - lainnya         : hostname (mis. "localhost")
 * Host pooler Supabase DIPAKAI BERSAMA banyak project, jadi host saja tidak
 * cukup -- itulah sebabnya username ikut dibaca.
 */
export function dbProjectRef(raw) {
  const u = new URL(raw);
  const m1 = /^postgres\.([a-z0-9]+)$/i.exec(decodeURIComponent(u.username));
  if (m1) return m1[1];
  const m2 = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(u.hostname);
  if (m2) return m2[1];
  return u.hostname;
}

function stop(msg) {
  console.error(`\nDIHENTIKAN: ${msg}`);
  process.exit(2);
}

/**
 * Lapis 1 — ENV. Dipanggil paling awal, sebelum import playwright.
 *
 * Aturan:
 *  - Domain aplikasi produksi: ditolak MUTLAK, flag apa pun tidak membantu.
 *  - Host non-lokal: butuh E2E_ALLOW_REMOTE=1  DAN  E2E_EXPECTED_DB_REF.
 *  - E2E_TEST_DATABASE_URL (jika diset): ref-nya HARUS sama dengan
 *    E2E_EXPECTED_DB_REF. Untuk target lokal tanpa E2E_EXPECTED_DB_REF,
 *    URL DB juga harus lokal (localhost/127.0.0.1).
 *  - Variabel DATABASE_URL/DIRECT_URL aplikasi TIDAK PERNAH dibaca di sini.
 */
export function assertSafeTarget(baseUrl) {
  const host = new URL(baseUrl).hostname;
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);

  if (PRODUCTION_APP_HOSTS.includes(host)) {
    stop(`${host} adalah domain PRODUKSI. Script ini tidak boleh dijalankan ke produksi.`);
  }

  const expectedRef = process.env.E2E_EXPECTED_DB_REF?.trim() || null;
  const testDbUrl = process.env.E2E_TEST_DATABASE_URL || null;

  if (!isLocal) {
    if (process.env.E2E_ALLOW_REMOTE !== "1") {
      stop(
        `BASE_URL menunjuk host non-lokal (${host}).\n` +
          "Jalankan ke server lokal, atau -- hanya untuk preview yang terhubung ke DB pengujian --\n" +
          "set E2E_ALLOW_REMOTE=1 dan E2E_EXPECTED_DB_REF=<project-ref DB pengujian yang disetujui>."
      );
    }
    if (!expectedRef) {
      stop("Target remote butuh E2E_EXPECTED_DB_REF (project-ref DB pengujian). Flag E2E_ALLOW_REMOTE saja tidak cukup.");
    }
  }

  if (testDbUrl) {
    let ref;
    try {
      ref = dbProjectRef(testDbUrl);
    } catch {
      stop("E2E_TEST_DATABASE_URL tidak valid.");
    }
    if (expectedRef) {
      if (ref !== expectedRef) {
        stop(
          `E2E_TEST_DATABASE_URL menunjuk project "${ref}", bukan E2E_EXPECTED_DB_REF "${expectedRef}".\n` +
            `(${describeDbUrl(testDbUrl)})`
        );
      }
    } else if (!["localhost", "127.0.0.1", "::1"].includes(ref)) {
      stop(
        `E2E_TEST_DATABASE_URL menunjuk database non-lokal (${describeDbUrl(testDbUrl)}) tanpa E2E_EXPECTED_DB_REF.\n` +
          "Set E2E_EXPECTED_DB_REF ke project-ref DB pengujian yang disetujui."
      );
    }
  }

  console.log(`Target aplikasi : ${baseUrl}${isLocal ? "" : "  (remote, diizinkan eksplisit)"}`);
  if (expectedRef) console.log(`DB ref disetujui: ${expectedRef}`);
  if (testDbUrl) console.log(`DB uji (tulis)  : ${describeDbUrl(testDbUrl)}`);
  return { isLocal, expectedRef, testDbUrl };
}

/** Login portal lewat UI. Mengembalikan true jika berhasil. */
export async function portalLogin(page, baseUrl, email, password = DEMO_PASSWORD) {
  await page.goto(`${baseUrl}/portal/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  if (page.url().includes("/portal/login")) return false;
  await page.waitForURL(/\/portal(\?|$)/, { timeout: 15000 });
  return true;
}

/**
 * Lapis 2 — RUNTIME. Dipanggil setelah browser siap, SEBELUM skenario apa pun.
 *
 *  a) Akun demo portal harus bisa login di BASE_URL. Produksi tidak punya
 *     tabel/akun ini -> gagal -> berhenti. (Bukti "bukan produksi".)
 *  b) Jika E2E_TEST_DATABASE_URL diset: baca lastLoginAt akun demo SEBELUM
 *     login dan SESUDAH login. Yang menulis kolom itu adalah APLIKASI, bukan
 *     script. Kalau nilainya tidak berubah, berarti aplikasi memakai database
 *     lain dari yang akan ditulis skenario 8 -> berhenti. (Bukti "DB uji =
 *     DB aplikasi", tanpa satu pun tulisan dari script.)
 *
 * Mengembalikan PrismaClient yang sudah terhubung ke DB uji (atau null).
 */
export async function bindTestDatabase({ browser, baseUrl, testDbUrl }) {
  let prisma = null;
  let before = null;

  if (testDbUrl) {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
    const acc = await prisma.clientAccount.findUnique({
      where: { email: DEMO_CLIENT_A },
      select: { lastLoginAt: true }
    });
    if (!acc) {
      await prisma.$disconnect();
      stop(`Akun demo ${DEMO_CLIENT_A} tidak ada di E2E_TEST_DATABASE_URL -- database ini belum di-seed atau bukan DB pengujian.`);
    }
    before = acc.lastLoginAt;
  }

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const ok = await portalLogin(page, baseUrl, DEMO_CLIENT_A);
  await ctx.close();
  if (!ok) {
    if (prisma) await prisma.$disconnect();
    stop(`Pre-flight: login ${DEMO_CLIENT_A} GAGAL di ${baseUrl}. Target ini tidak punya data demo portal (kemungkinan bukan DB pengujian).`);
  }
  console.log("Pre-flight     : akun demo portal bisa login di target ✓ (bukti \"bukan produksi saat ini\", BUKAN bukti identitas project)");

  if (prisma) {
    const after = await prisma.clientAccount.findUnique({
      where: { email: DEMO_CLIENT_A },
      select: { lastLoginAt: true }
    });
    const changed = !!after?.lastLoginAt && (!before || after.lastLoginAt.getTime() > before.getTime());
    if (!changed) {
      await prisma.$disconnect();
      stop(
        "Pre-flight: lastLoginAt di E2E_TEST_DATABASE_URL TIDAK berubah setelah login lewat aplikasi.\n" +
          "Aplikasi memakai database lain dari E2E_TEST_DATABASE_URL. Skenario yang menulis DB dibatalkan."
      );
    }
    console.log("Pre-flight     : aplikasi terbukti memakai DB uji yang sama (lastLoginAt berubah) ✓");
  }

  return prisma;
}
