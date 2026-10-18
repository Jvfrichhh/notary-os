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
 *
 * Prinsip: kalau identitas TIDAK bisa ditentukan dengan pasti, kembalikan
 * ref = null (fail-closed) -- jangan menebak.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const REF_RE = /^[a-z0-9]{10,}$/; // ref Supabase: huruf/angka kecil, 20 karakter; longgarkan ke >=10

/** Parse aman. Mengembalikan null jika kosong/tidak valid/bukan PostgreSQL. Tidak pernah melempar. */
export function parseDbUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    if (!/^postgres(ql)?:$/.test(u.protocol)) return null;
    if (!u.hostname) return null;
    return u;
  } catch {
    return null;
  }
}

/** hostname tanpa kurung IPv6 ("[::1]" -> "::1"). */
function plainHost(u) {
  return u.hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Deskripsi aman untuk dicetak: host:port/db (user: ...). Tidak pernah memuat password. */
export function describeDbUrl(raw) {
  const u = parseDbUrl(raw);
  if (!u) return raw ? "(URL tidak valid)" : "(tidak diset)";
  return `${plainHost(u)}:${u.port || "5432"}${u.pathname} (user: ${safeDecode(u.username) || "-"})`;
}

/**
 * Identitas:
 *  { ref, source, host, port, database, isLocal }
 *   - ref    : string, atau null jika tidak dapat ditentukan dengan pasti
 *   - source : "pooler-username" | "direct-host" | "hostname" | "pooler-unknown-ref" | "supabase-unknown-ref"
 *  atau null jika URL tidak valid.
 */
export function dbIdentity(raw) {
  const u = parseDbUrl(raw);
  if (!u) return null;
  const username = safeDecode(u.username);
  const host = plainHost(u);
  const base = {
    host,
    port: u.port || "5432",
    database: u.pathname.replace(/^\//, ""),
    isLocal: LOCAL_HOSTS.has(host)
  };

  const isPooler = /\.pooler\.supabase\.com$/.test(host);
  const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(host);

  if (isPooler) {
    // Host pooler dipakai bersama -> ref HANYA sah dari username "postgres.<ref>".
    const m = /^postgres\.([a-z0-9]+)$/i.exec(username);
    const ref = m ? m[1].toLowerCase() : null;
    if (ref && REF_RE.test(ref)) return { ref, source: "pooler-username", ...base };
    return { ref: null, source: "pooler-unknown-ref", ...base };
  }
  if (direct) {
    const ref = direct[1].toLowerCase();
    if (REF_RE.test(ref)) return { ref, source: "direct-host", ...base };
    return { ref: null, source: "supabase-unknown-ref", ...base };
  }
  if (/supabase\.(co|com)$/.test(host)) {
    // Host Supabase lain yang polanya tidak dikenal -> jangan menebak.
    return { ref: null, source: "supabase-unknown-ref", ...base };
  }
  // Non-Supabase (lokal / self-hosted): identitas = hostname.
  return { ref: host, source: "hostname", ...base };
}

/** Hanya ref-nya; melempar jika URL tidak valid ATAU ref tidak dapat ditentukan. */
export function dbProjectRef(raw) {
  const id = dbIdentity(raw);
  if (!id) throw new Error("connection string tidak valid");
  if (!id.ref) throw new Error(`project-ref tidak dapat ditentukan (${id.source}: ${id.host})`);
  return id.ref;
}

/**
 * Bandingkan dua URL (DATABASE_URL vs DIRECT_URL).
 * same === true hanya jika keduanya valid, ref keduanya DAPAT ditentukan,
 * ref identik, DAN nama database identik. Host/port boleh berbeda
 * (pooler 6543 vs direct 5432 adalah normal).
 */
export function compareIdentities(rawA, rawB) {
  const a = dbIdentity(rawA);
  const b = dbIdentity(rawB);
  if (!a || !b) return { same: false, reason: "salah satu URL tidak diset/tidak valid", a, b };
  if (!a.ref || !b.ref) return { same: false, reason: `project-ref tidak dapat ditentukan (${!a.ref ? a.source : b.source})`, a, b };
  if (a.ref !== b.ref) return { same: false, reason: `project-ref berbeda (${a.ref} vs ${b.ref})`, a, b };
  if (a.database !== b.database) return { same: false, reason: `nama database berbeda (${a.database} vs ${b.database})`, a, b };
  return { same: true, reason: null, a, b };
}

/**
 * Redaksi untuk pesan error: hapus password dari URL mana pun yang mungkin
 * ikut tercetak, dan hapus password yang dikenal dari URL yang kita pegang.
 */
export function redactSecrets(text, knownUrls = []) {
  let out = String(text ?? "");
  // user:password@host -> user:***@host
  out = out.replace(/(postgres(?:ql)?:\/\/[^\s:@/]+):([^\s@]+)@/gi, "$1:***@");
  for (const raw of knownUrls) {
    const u = parseDbUrl(raw);
    const pw = u?.password ? safeDecode(u.password) : "";
    if (pw && pw.length >= 4) out = out.split(pw).join("***").split(u.password).join("***");
  }
  return out;
}
