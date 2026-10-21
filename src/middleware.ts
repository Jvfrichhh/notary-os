import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { DOMAIN_SPLIT_ENABLED, isPortalHost, isStaffHost, portalOrigin, staffOrigin } from "@/lib/hosts";

/**
 * Pemisah dua area aplikasi:
 *   - /portal/** dan /api/portal/** : hanya akun PORTAL KLIEN (token.kind === "client")
 *   - selain itu                    : hanya akun INTERNAL     (token.kind === "staff")
 *
 * Mode DOMAIN TERPISAH (aktif jika env PORTAL_HOST diset, lihat lib/hosts.ts):
 *   - di host portal : "/" -> /portal, "/login" -> /portal/login (rewrite, URL tetap
 *                      bersih); path internal (/dashboard, /clients, ...) dialihkan ke "/"
 *   - di host kantor : /portal/** dialihkan ke host portal
 *   Endpoint /api/auth/** dilayani di kedua host (cookie sesi per host).
 *
 * Token dibaca dari cookie JWT yang ditandatangani server (NEXTAUTH_SECRET);
 * browser tidak bisa memalsukan `kind`. Middleware hanya lapis pertama --
 * setiap halaman/action/API tetap memverifikasi ulang lewat requireUser() /
 * requireClientAccount() / requirePermission().
 *
 * Catatan: middleware berjalan di Edge, jadi tidak boleh memakai Prisma di sini.
 */
export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let pathname = url.pathname;
  const { search } = url;

  const isApi = pathname.startsWith("/api/");
  const isAuthApi = pathname.startsWith("/api/auth/");

  // ------------------------------------------------------------------
  // 0) Routing berdasarkan DOMAIN (hanya jika PORTAL_HOST diset)
  // ------------------------------------------------------------------
  let rewriteTo: string | null = null;
  if (DOMAIN_SPLIT_ENABLED) {
    if (isPortalHost(host)) {
      if (pathname === "/") rewriteTo = "/portal";
      else if (pathname === "/login") rewriteTo = "/portal/login";
      if (rewriteTo) pathname = rewriteTo;

      const allowedOnPortalHost =
        pathname === "/portal" || pathname.startsWith("/portal/") || pathname.startsWith("/api/portal/") || isAuthApi;
      if (!allowedOnPortalHost) {
        // Path internal diminta di domain klien -> kembalikan ke beranda portal.
        if (isApi) return NextResponse.json({ error: "Endpoint tidak tersedia di domain portal." }, { status: 404 });
        return NextResponse.redirect(new URL("/", req.url));
      }
    } else if (isStaffHost(host)) {
      const po = portalOrigin(url.protocol);
      if (po && (pathname === "/portal" || pathname.startsWith("/portal/"))) {
        // Portal dibuka di domain kantor -> arahkan ke domain portal, path dibersihkan.
        const clean = pathname === "/portal" ? "/" : pathname === "/portal/login" ? "/login" : pathname;
        return NextResponse.redirect(new URL(clean + search, po));
      }
    }
  }

  // Cron Vercel: tanpa sesi login; route-nya memeriksa CRON_SECRET sendiri.
  if (pathname === "/api/cron/daily") return NextResponse.next();

  // Halaman login (keduanya) tidak butuh token -- lewatkan di sini, SETELAH
  // routing domain, supaya "/login" di host portal sudah menjadi /portal/login.
  if (pathname === "/login" || pathname === "/portal/login") {
    if (rewriteTo) {
      const target = url.clone();
      target.pathname = rewriteTo;
      return NextResponse.rewrite(target);
    }
    return NextResponse.next();
  }

  // ------------------------------------------------------------------
  // 1) Autentikasi & jenis akun
  // ------------------------------------------------------------------
  const token = await getToken({ req });
  const isPortal = pathname === "/portal" || pathname.startsWith("/portal/") || pathname.startsWith("/api/portal/");

  if (!token) {
    if (isApi) return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
    const loginUrl = url.clone();
    // Di domain portal, halaman login-nya "/login" (di-rewrite ke /portal/login).
    loginUrl.pathname = isPortal ? (isPortalHost(host) ? "/login" : "/portal/login") : "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("callbackUrl", url.pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // Token lama (sebelum portal ada) tidak punya `kind` -> pasti internal.
  const isClient = token.kind === "client";

  // 2) Akun internal mencoba membuka portal klien
  if (isPortal && !isClient) {
    if (isApi) return NextResponse.json({ error: "Endpoint ini khusus akun portal klien." }, { status: 403 });
    const so = staffOrigin(url.protocol);
    // Di domain portal tidak ada /dashboard -> kirim ke domain kantor jika diketahui.
    return NextResponse.redirect(isPortalHost(host) && so ? new URL("/dashboard", so) : new URL("/dashboard", req.url));
  }

  // 3) Akun klien mencoba membuka area internal
  if (!isPortal && isClient) {
    if (isApi) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const po = portalOrigin(url.protocol);
    return NextResponse.redirect(DOMAIN_SPLIT_ENABLED && po ? new URL("/", po) : new URL("/portal", req.url));
  }

  if (rewriteTo) {
    const target = url.clone();
    target.pathname = rewriteTo;
    return NextResponse.rewrite(target);
  }
  return NextResponse.next();
}

// Semua route dilindungi KECUALI halaman login (internal & portal), endpoint
// NextAuth, dan asset statis. "/login" tetap masuk matcher agar di domain
// portal bisa di-rewrite ke /portal/login; halaman login sendiri tidak butuh
// token (ditangani di dalam: path /login & /portal/login lolos tanpa token).
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"]
};
