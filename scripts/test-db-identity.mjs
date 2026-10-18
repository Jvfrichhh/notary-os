/**
 * Unit test logika murni scripts/lib/db-identity.mjs — tanpa jaringan, tanpa DB.
 *   node scripts/test-db-identity.mjs
 */
import { parseDbUrl, describeDbUrl, dbIdentity, dbProjectRef, compareIdentities, redactSecrets } from "./lib/db-identity.mjs";

const PW = "S3cr3t!Pa%40ss"; // mengandung %40 (= @ ter-encode) untuk menguji parsing
const PW_PLAIN = "S3cr3t!Pa@ss";
const REF = "abcdefghij1234567890";
const REF2 = "zyxwvutsrq0987654321";

const U = {
  pooler: `postgresql://postgres.${REF}:${PW}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  poolerUpper: `postgresql://postgres.${REF.toUpperCase()}:${PW}@AWS-0-AP-SOUTHEAST-1.POOLER.SUPABASE.COM:6543/postgres`,
  poolerEncodedDot: `postgresql://postgres%2E${REF}:${PW}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  poolerBadUser: `postgresql://postgres:${PW}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  poolerShortRef: `postgresql://postgres.abc:${PW}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  poolerOtherDb: `postgresql://postgres.${REF}:${PW}@aws-0-ap-southeast-1.pooler.supabase.com:6543/otherdb`,
  direct: `postgres://postgres:${PW}@db.${REF}.supabase.co:5432/postgres`,
  direct2: `postgresql://postgres:${PW}@db.${REF2}.supabase.co:5432/postgres`,
  supabaseOddHost: `postgresql://postgres:${PW}@${REF}.supabase.co:5432/postgres`,
  fakeSupabase: `postgresql://postgres.${REF}:${PW}@evil.example.com:5432/postgres`,
  local: `postgresql://postgres:${PW}@localhost:5433/notary`,
  local127: `postgresql://postgres:${PW}@127.0.0.1/notary`,
  localV6: `postgresql://postgres:${PW}@[::1]:5432/notary`,
  noHost: `postgresql:///notary`,
  mysql: `mysql://u:${PW}@h/db`,
  prismaAccel: `prisma://accelerate.prisma-data.net/?api_key=abc`,
  invalid: "bukan url",
  empty: "",
  undef: undefined
};

let failed = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n     dapat : ${JSON.stringify(actual)}\n     harap : ${JSON.stringify(expected)}`}`);
}
const id = (u) => {
  const r = dbIdentity(u);
  return r && { ref: r.ref, source: r.source, local: r.isLocal, db: r.database };
};

console.log("\n[parse]");
t("postgresql:// valid", !!parseDbUrl(U.pooler), true);
t("postgres:// valid", !!parseDbUrl(U.direct), true);
t("tanpa host -> null", parseDbUrl(U.noHost), null);
t("mysql -> null", parseDbUrl(U.mysql), null);
t("prisma:// (Accelerate) -> null (tidak didukung, fail-closed)", parseDbUrl(U.prismaAccel), null);
t("string acak -> null", parseDbUrl(U.invalid), null);
t("kosong -> null", parseDbUrl(U.empty), null);
t("undefined -> null", parseDbUrl(U.undef), null);

console.log("\n[klasifikasi ref]");
t("pooler username postgres.<ref>", id(U.pooler), { ref: REF, source: "pooler-username", local: false, db: "postgres" });
t("pooler huruf besar -> dinormalisasi kecil", id(U.poolerUpper), { ref: REF, source: "pooler-username", local: false, db: "postgres" });
t("pooler username ter-encode (%2E)", id(U.poolerEncodedDot), { ref: REF, source: "pooler-username", local: false, db: "postgres" });
t("pooler TANPA postgres.<ref> -> ref null (bukan host bersama!)", id(U.poolerBadUser), { ref: null, source: "pooler-unknown-ref", local: false, db: "postgres" });
t("pooler ref terlalu pendek -> ref null", id(U.poolerShortRef), { ref: null, source: "pooler-unknown-ref", local: false, db: "postgres" });
t("direct host db.<ref>.supabase.co", id(U.direct), { ref: REF, source: "direct-host", local: false, db: "postgres" });
t("host supabase pola lain -> ref null", id(U.supabaseOddHost), { ref: null, source: "supabase-unknown-ref", local: false, db: "postgres" });
t("username postgres.<ref> di host NON-supabase -> bukan ref supabase (hostname)", id(U.fakeSupabase), { ref: "evil.example.com", source: "hostname", local: false, db: "postgres" });
t("localhost", id(U.local), { ref: "localhost", source: "hostname", local: true, db: "notary" });
t("127.0.0.1 tanpa port", id(U.local127), { ref: "127.0.0.1", source: "hostname", local: true, db: "notary" });
t("IPv6 [::1] -> lokal", id(U.localV6), { ref: "::1", source: "hostname", local: true, db: "notary" });
t("tidak valid -> null", id(U.invalid), null);

console.log("\n[dbProjectRef melempar bila tidak pasti]");
const throws = (u) => { try { dbProjectRef(u); return false; } catch { return true; } };
t("pooler valid -> tidak melempar", throws(U.pooler), false);
t("pooler tanpa ref -> melempar", throws(U.poolerBadUser), true);
t("supabase pola lain -> melempar", throws(U.supabaseOddHost), true);
t("tidak valid -> melempar", throws(U.invalid), true);

console.log("\n[compareIdentities]");
const cmp = (a, b) => { const r = compareIdentities(a, b); return { same: r.same, reason: r.reason }; };
t("pooler vs direct, ref & db sama -> same", cmp(U.pooler, U.direct), { same: true, reason: null });
t("pooler vs direct, ref sama tapi db beda -> beda", cmp(U.poolerOtherDb, U.direct).same, false);
t("ref beda -> beda", cmp(U.pooler, U.direct2).same, false);
t("salah satu ref null -> beda (bukan 'same' karena host sama)", cmp(U.poolerBadUser, U.poolerBadUser).same, false);
t("salah satu tidak valid -> beda", cmp(U.pooler, U.invalid).same, false);
t("keduanya kosong -> beda", cmp(U.empty, U.undef).same, false);
t("lokal vs lokal db sama -> same", cmp(U.local, U.local).same, true);

console.log("\n[tidak ada rahasia tercetak]");
const allDescr = Object.values(U).map((u) => describeDbUrl(u)).join("|");
const allIds = JSON.stringify(Object.values(U).map((u) => dbIdentity(u)));
const allCmp = JSON.stringify(Object.values(U).map((u) => compareIdentities(u, U.direct)));
const blob = allDescr + allIds + allCmp;
t("describe/identity/compare tidak memuat password (encoded)", blob.includes(PW), false);
t("describe/identity/compare tidak memuat password (plain)", blob.includes(PW_PLAIN), false);
t("describe/identity/compare tidak memuat 'postgresql://'", blob.includes("postgresql://"), false);

console.log("\n[redactSecrets]");
const msg = `Can't reach ${U.pooler} and ${U.direct} password=${PW_PLAIN}`;
const red = redactSecrets(msg, [U.pooler, U.direct]);
t("URL di pesan error diredaksi (encoded pw hilang)", red.includes(PW), false);
t("password plain di pesan error diredaksi", red.includes(PW_PLAIN), false);
t("host tetap terlihat (berguna untuk debug)", red.includes("pooler.supabase.com"), true);
t("pesan tanpa rahasia tidak berubah", redactSecrets("P1001: Can't reach database server at `db.x.supabase.co`:`5432`", [U.direct]), "P1001: Can't reach database server at `db.x.supabase.co`:`5432`");

console.log(failed === 0 ? "\n✓ Semua unit test db-identity lolos." : `\n✗ ${failed} unit test gagal.`);
process.exit(failed === 0 ? 0 : 1);
