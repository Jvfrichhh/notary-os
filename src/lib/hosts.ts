/**
 * Pemisahan DOMAIN antara aplikasi kantor (staff) dan portal klien.
 *
 * Satu deployment Next.js melayani dua host:
 *   STAFF_HOST  -> area internal (/dashboard, /clients, ...)
 *   PORTAL_HOST -> portal klien (/portal/**), dengan "/" dan "/login"
 *                  di-rewrite ke /portal dan /portal/login
 *
 * Keduanya memakai database & kode yang sama, jadi unggahan klien langsung
 * terlihat staff. Sesi login (cookie NextAuth) terpisah per host -- itu
 * memang yang diinginkan.
 *
 * Jika env tidak diset, aplikasi berjalan seperti sebelumnya (satu host,
 * pemisahan berdasarkan path /portal). Jadi aman untuk production yang ada.
 *
 * Nilai env berupa hostname saja, tanpa protokol, mis.:
 *   STAFF_HOST=notary-os-three.vercel.app
 *   PORTAL_HOST=notary-os-portal.vercel.app
 * Boleh beberapa host dipisah koma (mis. domain kustom + domain vercel).
 */

function parseHosts(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);
}

export const PORTAL_HOSTS = parseHosts(process.env.PORTAL_HOST);
export const STAFF_HOSTS = parseHosts(process.env.STAFF_HOST);

/** Pemisahan domain aktif hanya jika PORTAL_HOST diset. */
export const DOMAIN_SPLIT_ENABLED = PORTAL_HOSTS.length > 0;

function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(":")[0];
}

export function isPortalHost(host: string | null | undefined): boolean {
  return DOMAIN_SPLIT_ENABLED && PORTAL_HOSTS.includes(normalizeHost(host));
}

export function isStaffHost(host: string | null | undefined): boolean {
  if (!DOMAIN_SPLIT_ENABLED) return true;
  const h = normalizeHost(host);
  // Jika STAFF_HOST tidak diset, semua host selain portal dianggap host kantor.
  return STAFF_HOSTS.length === 0 ? !PORTAL_HOSTS.includes(h) : STAFF_HOSTS.includes(h);
}

/** Origin absolut host portal/kantor utama (untuk redirect lintas host). */
export function portalOrigin(protocol = "https:"): string | null {
  return PORTAL_HOSTS[0] ? `${protocol}//${PORTAL_HOSTS[0]}` : null;
}
export function staffOrigin(protocol = "https:"): string | null {
  return STAFF_HOSTS[0] ? `${protocol}//${STAFF_HOSTS[0]}` : null;
}

/** Host yang boleh menjadi tujuan redirect NextAuth (signIn/signOut callbackUrl). */
export function isAllowedRedirectHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  return PORTAL_HOSTS.includes(h) || STAFF_HOSTS.includes(h);
}
