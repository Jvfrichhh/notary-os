// Jalur portal klien untuk unduh Tagihan/Kuitansi miliknya sendiri (middleware
// hanya mengizinkan akun klien di /api/portal/**). Logika & pemeriksaan
// kepemilikan sama dengan /api/billing.
import { GET as billingGet } from "@/app/api/billing/[kind]/[id]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = billingGet;
