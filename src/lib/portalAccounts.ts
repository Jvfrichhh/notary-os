import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

/**
 * Password sementara untuk akun portal yang dibuat/di-reset kantor.
 * 12 karakter dari alfabet tanpa karakter ambigu (0/O, 1/l/I) supaya mudah
 * dibacakan lewat telepon/WA. Dibangkitkan dengan crypto.randomInt (CSPRNG).
 * Hanya ditampilkan SEKALI ke staff; yang disimpan hanya hash bcrypt-nya.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateTemporaryPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(0, ALPHABET.length)];
  return out;
}

export async function hashPortalPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/** Aturan password baru yang dipilih klien sendiri. */
export function validateNewPassword(pw: string): string | null {
  if (pw.length < 8) return "Password minimal 8 karakter.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password harus mengandung huruf dan angka.";
  return null;
}
