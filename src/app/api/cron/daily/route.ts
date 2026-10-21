import { NextResponse, type NextRequest } from "next/server";
import { runDailyChecks } from "@/lib/compliance/daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dipanggil Cron Vercel setiap hari (lihat vercel.json). Bila env CRON_SECRET
 * diisi, Vercel mengirim "Authorization: Bearer <CRON_SECRET>" dan permintaan
 * lain ditolak. Tanpa CRON_SECRET endpoint tetap aman dipanggil berulang
 * (pengingat tidak dobel, backup maksimal seminggu sekali).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
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
