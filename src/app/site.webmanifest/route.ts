import { headers } from "next/headers";
import { isPortalHost } from "@/lib/hosts";

/**
 * Manifest PWA: membuat Nexora bisa di-"Install" dari Chrome/Edge (laptop)
 * atau "Tambahkan ke Layar Utama" (HP) dan terbuka di jendela sendiri.
 * Satu deployment melayani dua domain, jadi isinya menyesuaikan host:
 * domain portal -> "Nexora Klien", domain kantor -> "Nexora".
 */
export const dynamic = "force-dynamic";

const ICONS = [
  { src: "/brand/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/brand/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/brand/app-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
];

export async function GET() {
  const h = await headers();
  const portal = isPortalHost(h.get("x-forwarded-host") ?? h.get("host"));

  const manifest = portal
    ? {
        id: "/?app=nexora-klien",
        name: "Nexora Klien — Portal Kantor Notaris",
        short_name: "Nexora Klien",
        description: "Pantau pekerjaan dan unggah dokumen ke kantor notaris.",
        start_url: "/",
        scope: "/"
      }
    : {
        id: "/?app=nexora",
        name: "Nexora — Kantor Notaris & PPAT",
        short_name: "Nexora",
        description: "Sistem manajemen kantor notaris.",
        start_url: "/dashboard",
        scope: "/"
      };

  return new Response(
    JSON.stringify({
      ...manifest,
      lang: "id",
      display: "standalone",
      orientation: "any",
      background_color: "#051D17",
      theme_color: "#082A21",
      icons: ICONS
    }),
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    }
  );
}
