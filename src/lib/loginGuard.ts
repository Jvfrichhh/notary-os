import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Perlindungan login (akun internal & portal klien):
 *  - batas percobaan gagal: 5x per email dari IP yang sama / 20x per IP dalam
 *    15 menit; percobaan tersebar ke satu email diperlambat, bukan dikunci;
 *  - setiap kegagalan dicatat di audit log (action "login_failed");
 *  - akun yang tidak ada tetap menjalankan bcrypt (waktu respons sama),
 *    supaya penyerang tidak bisa menebak email mana yang terdaftar.
 */
export type LoginScope = "staff" | "client";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;
/** Di atas ini (dari IP mana pun) setiap percobaan diperlambat 2 detik. */
const MAX_PER_EMAIL_ANY_IP = 15;

/** Pesan error yang dikirim ke halaman login saat percobaan diblokir sementara. */
export const LOGIN_LOCKED_ERROR = "TOO_MANY_ATTEMPTS";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** IP klien dari header proxy Vercel (alamat pertama x-forwarded-for). */
export function clientIp(headers: unknown): string {
  const h = (headers ?? {}) as Record<string, string | string[] | undefined>;
  const raw = h["x-forwarded-for"] ?? h["x-real-ip"];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (v ?? "").split(",")[0].trim().slice(0, 64) || "unknown";
}

function entityType(scope: LoginScope) {
  return scope === "staff" ? "LoginStaff" : "LoginClient";
}

export async function isLoginLocked(scope: LoginScope, email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const recent = { action: "login_failed", entityType: entityType(scope), entityId: email, timestamp: { gte: since } };
  // Kunci per pasangan email + IP: penyerang dari luar tidak bisa mengunci akun
  // pemilik yang login dari kantor/HP-nya sendiri.
  if (ip !== "unknown") {
    const byEmailIp = await prisma.auditLog.count({ where: { ...recent, newValue: { path: ["ip"], equals: ip } } });
    if (byEmailIp >= MAX_PER_EMAIL) return true;
    const byIp = await prisma.auditLog.count({
      where: { action: "login_failed", timestamp: { gte: since }, newValue: { path: ["ip"], equals: ip } }
    });
    if (byIp >= MAX_PER_IP) return true;
  }
  // Serangan tersebar dari banyak IP ke satu akun: diperlambat (bukan dikunci).
  const byEmail = await prisma.auditLog.count({ where: recent });
  if (byEmail >= MAX_PER_EMAIL_ANY_IP) await new Promise((r) => setTimeout(r, 2000));
  return ip === "unknown" && byEmail >= MAX_PER_EMAIL;
}

export async function recordLoginFailure(scope: LoginScope, email: string, ip: string, reason: string) {
  await prisma.auditLog.create({
    data: { userId: null, action: "login_failed", entityType: entityType(scope), entityId: email.slice(0, 200), newValue: { ip, reason } }
  });
}

let dummyHash: string | null = null;

/** bcrypt.compare yang tetap memakan waktu yang sama bila akun tidak ditemukan. */
export async function comparePassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    dummyHash ??= await bcrypt.hash("akun-tidak-ada-" + Math.random(), 12);
    await bcrypt.compare(plain, dummyHash);
    return false;
  }
  return bcrypt.compare(plain, hash);
}

/**
 * Sidik password (bukan password-nya): berubah setiap kali password diganti
 * atau di-reset, sehingga sesi lama otomatis tidak berlaku. Disimpan di JWT
 * (terenkripsi), tidak pernah dikirim ke browser.
 */
export function passwordVersion(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}
