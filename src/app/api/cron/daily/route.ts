import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { runDailyChecks } from "@/lib/compliance/daily";

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dipanggil Cron Vercel setiap hari (lihat vercel.json). Vercel mengirim
 * "Authorization: Bearer <CRON_SECRET>"; permintaan lain ditolak. Di Vercel
 * (production maupun preview) CRON_SECRET WAJIB diisi -- tanpa itu endpoint
 * menolak semua permintaan. Hanya di komputer lokal boleh dipanggil tanpa secret.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.VERCEL_ENV) {
    console.error("[cron] CRON_SECRET belum diisi; pengecekan harian dilewati.");
    return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi." }, { status: 401 });
  }
  if (secret && !sameSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
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
