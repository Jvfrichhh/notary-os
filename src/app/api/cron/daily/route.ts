import { NextResponse, type NextRequest } from "next/server";
import { runDailyChecks } from "@/lib/compliance/daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dipanggil Cron Vercel setiap hari (lihat vercel.json). Vercel mengirim
 * "Authorization: Bearer <CRON_SECRET>"; permintaan lain ditolak. Di production
 * CRON_SECRET WAJIB diisi -- tanpa itu endpoint menolak semua permintaan.
 * Di lingkungan lain (dev/preview) tanpa CRON_SECRET boleh dipanggil untuk uji.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.VERCEL_ENV === "production") {
    console.error("[cron] CRON_SECRET belum diisi di production; pengecekan harian dilewati.");
    return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi." }, { status: 401 });
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  try {
    const result = await runDailyChecks();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron] pengecekan harian gagal", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
