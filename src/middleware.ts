import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Pemisah dua area aplikasi:
 *   - /portal/** dan /api/portal/** : hanya akun PORTAL KLIEN (token.kind === "client")
 *   - selain itu                    : hanya akun INTERNAL     (token.kind === "staff")
 *
 * Token dibaca dari cookie JWT yang ditandatangani server (NEXTAUTH_SECRET);
 * browser tidak bisa memalsukan `kind`. Middleware hanya lapis pertama --
 * setiap halaman/action/API tetap memverifikasi ulang lewat requireUser() /
 * requireClientAccount() / requirePermission() (lihat src/lib/session.ts dan
 * src/lib/portalSession.ts).
 *
 * Catatan: middleware berjalan di Edge, jadi tidak boleh memakai Prisma di sini.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = await getToken({ req });

  const isApi = pathname.startsWith("/api/");
  // Area portal = halaman /portal/** DAN endpoint /api/portal/** (unduh dokumen klien).
  const isPortal = pathname === "/portal" || pathname.startsWith("/portal/") || pathname.startsWith("/api/portal/");

  // 1) Belum login
  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = isPortal ? "/portal/login" : "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // Token lama (sebelum portal ada) tidak punya `kind` -> pasti internal.
  const isClient = token.kind === "client";

  // 2) Akun internal mencoba membuka portal klien -> kembalikan ke dashboard
  //    (atau 403 untuk endpoint API portal).
  if (isPortal && !isClient) {
    if (isApi) {
      return NextResponse.json({ error: "Endpoint ini khusus akun portal klien." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 3) Akun klien mencoba membuka area internal (halaman/API) -> tolak.
  if (!isPortal && isClient) {
    if (isApi) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  return NextResponse.next();
}

// Semua route dilindungi KECUALI halaman login (internal & portal), endpoint
// NextAuth, dan asset statis.
export const config = {
  matcher: ["/((?!login|portal/login|api/auth|_next/static|_next/image|favicon.ico).*)"]
};
