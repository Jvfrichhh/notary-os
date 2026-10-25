/*
 * Service worker Nexora (aplikasi terpasang / PWA).
 * SENGAJA tidak menyimpan (cache) halaman, data, atau dokumen apa pun di
 * perangkat: data akta & klien tetap hanya di server. Satu-satunya fungsi:
 * bila perangkat sedang offline, tampilkan halaman pemberitahuan sederhana
 * alih-alih layar error browser.
 */
const OFFLINE_HTML = `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Nexora — Offline</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#051D17;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{color:#D9B26F;letter-spacing:.2em;font-size:20px}p{opacity:.85;max-width:320px;line-height:1.5}
button{margin-top:12px;background:#D9B26F;color:#051D17;border:0;border-radius:8px;padding:12px 20px;font-weight:700;font-size:15px}</style>
</head><body><div><h1>NEXORA</h1><p>Tidak ada koneksi internet. Periksa jaringan Anda, lalu coba lagi.</p>
<button onclick="location.reload()">Coba lagi</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate" || req.method !== "GET") return; // selain halaman: biarkan browser
  event.respondWith(
    fetch(req).catch(
      () => new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } })
    )
  );
});
