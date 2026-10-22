import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Perlindungan login (akun internal & portal klien):
 *  - batas percobaan gagal: 5x per email / 20x per alamat IP dalam 15 menit;
 *  - setiap kegagalan dicatat di audit log (action "login_failed");
 *  - akun yang tidak ada tetap menjalankan bcrypt (waktu respons sama),
 *    supaya penyerang tidak bisa menebak email mana yang terdaftar.
 */
export type LoginScope = "staff" | "client";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

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
  const byEmail = await prisma.auditLog.count({
    where: { action: "login_failed", entityType: entityType(scope), entityId: email, timestamp: { gte: since } }
  });
  if (byEmail >= MAX_PER_EMAIL) return true;
  if (ip === "unknown") return false;
  const byIp = await prisma.auditLog.count({
    where: { action: "login_failed", timestamp: { gte: since }, newValue: { path: ["ip"], equals: ip } }
  });
  return byIp >= MAX_PER_IP;
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
