/**
 * Header keamanan untuk semua halaman:
 *  - frame-ancestors 'none' / X-Frame-Options: aplikasi tidak bisa dibingkai situs lain (clickjacking);
 *  - HSTS: browser selalu memakai HTTPS;
 *  - nosniff, Referrer-Policy, Permissions-Policy: perilaku browser yang aman.
 * CSP sengaja minimal (tanpa script-src) supaya skrip bawaan Next.js tetap jalan.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Penanda versi build (untuk pemberitahuan "Versi baru tersedia"); ditanam
  // saat build ke kode server & browser sekaligus.
  env: {
    APP_VERSION: (process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "dev").slice(0, 40)
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" }
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
