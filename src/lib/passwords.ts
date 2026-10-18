import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

/**
 * Utilitas password bersama untuk akun internal (users) dan akun portal
 * (client_accounts). Hash selalu bcrypt cost 10 -- kompatibel dengan
 * authorize() di lib/auth.ts.
 */

// Tanpa karakter ambigu (0/O, 1/l/I) supaya mudah dibacakan.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** Password sementara acak (CSPRNG), default 12 karakter. Hanya ditampilkan sekali. */
export function generateTemporaryPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(0, ALPHABET.length)];
  return out;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/** Aturan password baru yang dipilih pengguna sendiri. null = valid. */
export function validateNewPassword(pw: string): string | null {
  if (pw.length < 8) return "Password minimal 8 karakter.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password harus mengandung huruf dan angka.";
  return null;
}
