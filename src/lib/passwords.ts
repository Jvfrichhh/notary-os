import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

/**
 * Utilitas password bersama untuk akun internal (users) dan akun portal
 * (client_accounts). Hash bcrypt cost 12 (hash lama cost 10 tetap bisa
 * dipakai login; bcrypt menyimpan cost di dalam hash).
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
  return bcrypt.hash(plain, 12);
}

/** Password yang paling sering dicoba penyerang (ditolak walau memenuhi aturan). */
const COMMON = new Set([
  "password123", "password1234", "qwerty12345", "1234567890a", "a1234567890", "admin12345", "notaris123",
  "notaris2026", "bismillah1", "bismillah123", "indonesia1", "indonesia123", "jakarta123", "bogor12345", "abcdefgh12"
]);

/** Aturan password baru yang dipilih pengguna sendiri. null = valid. */
export function validateNewPassword(pw: string): string | null {
  if (pw.length < 10) return "Password minimal 10 karakter.";
  if (COMMON.has(pw.toLowerCase())) return "Password terlalu mudah ditebak. Pilih yang lain.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password harus mengandung huruf dan angka.";
  return null;
}
