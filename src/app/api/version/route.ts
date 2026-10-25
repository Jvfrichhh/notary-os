/**
 * Versi build yang sedang aktif di server. Dibandingkan oleh UpdateNotice
 * dengan versi yang tertanam di halaman yang sedang terbuka; bila beda,
 * muncul ajakan "Muat ulang". Tidak butuh login (tidak berisi data apa pun).
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { v: process.env.APP_VERSION ?? "dev" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
