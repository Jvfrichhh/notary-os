/**
 * Identitas database dari connection string, TANPA pernah mengekspos password.
 * Dipakai oleh scripts/db-target.ts dan scripts/lib/e2e-guard.mjs supaya
 * definisi "project-ref" hanya ada di satu tempat.
 *
 * Konvensi Supabase:
 *   pooler : postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres
 *            -> host DIPAKAI BERSAMA banyak project; ref ada di USERNAME
 *   direct : postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres
 *            -> ref ada di HOST
 * Selain itu (Postgres lokal/self-hosted): ref = hostname.
 */

/** Parse aman. Mengembalikan null jika kosong/tidak valid. Tidak pernah melempar. */
export function parseDbUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    if (!/^postgres(ql)?:$/.test(u.protocol)) return null;
    return u;
  } catch {
    return null;
  }
}

/** Deskripsi aman untuk dicetak: host:port/db (user: ...). */
export function describeDbUrl(raw) {
  const u = parseDbUrl(raw);
  if (!u) return raw ? "(URL tidak valid)" : "(tidak diset)";
  return `${u.hostname}:${u.port || "5432"}${u.pathname} (user: ${decodeURIComponent(u.username) || "-"})`;
}

/**
 * Project-ref + dari mana ia ditentukan.
 *  { ref, source: "pooler-username" | "direct-host" | "hostname", host, port, database, isLocal }
 * atau null jika URL tidak valid.
 */
export function dbIdentity(raw) {
  const u = parseDbUrl(raw);
  if (!u) return null;
  const username = decodeURIComponent(u.username);
  const host = u.hostname;
  const base = { host, port: u.port || "5432", database: u.pathname.replace(/^\//, ""), isLocal: ["localhost", "127.0.0.1", "::1"].includes(host) };

  const m1 = /^postgres\.([a-z0-9]+)$/i.exec(username);
  if (m1 && /\.pooler\.supabase\.com$/i.test(host)) return { ref: m1[1], source: "pooler-username", ...base };

  const m2 = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(host);
  if (m2) return { ref: m2[1], source: "direct-host", ...base };

  return { ref: host, source: "hostname", ...base };
}

/** Kompatibilitas dengan pemanggil lama: hanya ref-nya (melempar jika tidak valid). */
export function dbProjectRef(raw) {
  const id = dbIdentity(raw);
  if (!id) throw new Error("connection string tidak valid");
  return id.ref;
}

/**
 * Bandingkan dua URL (DATABASE_URL vs DIRECT_URL).
 * same === true hanya jika keduanya valid DAN ref identik DAN nama database identik.
 */
export function compareIdentities(rawA, rawB) {
  const a = dbIdentity(rawA);
  const b = dbIdentity(rawB);
  if (!a || !b) return { same: false, reason: "salah satu URL tidak diset/tidak valid", a, b };
  if (a.ref !== b.ref) return { same: false, reason: `project-ref berbeda (${a.ref} vs ${b.ref})`, a, b };
  if (a.database !== b.database) return { same: false, reason: `nama database berbeda (${a.database} vs ${b.database})`, a, b };
  return { same: true, reason: null, a, b };
}
