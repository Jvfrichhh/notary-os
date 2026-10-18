import { prisma } from "@/lib/prisma";

/**
 * Semua pengecekan permission harus lewat fungsi ini (server-side),
 * bukan cuma disembunyikan di UI. Dipanggil di setiap API route /
 * Server Action sebelum melakukan aksi.
 *
 * Blueprint §10 Security Architecture: "Authorization: selalu server-side."
 */
export async function userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } }
  });

  if (!user || !user.isActive) return false;

  return user.role.permissions.some((rp) => rp.permission.key === permissionKey);
}

/**
 * Ambil SEMUA permission key milik user dalam satu query. Dipakai di layout
 * (untuk memfilter menu sidebar) dan di tempat lain yang butuh banyak
 * pengecekan sekaligus -- lebih hemat daripada memanggil userHasPermission()
 * berulang kali. User nonaktif / tidak ditemukan -> set kosong.
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } }
  });

  if (!user || !user.isActive) return new Set();

  return new Set(user.role.permissions.map((rp) => rp.permission.key));
}

/**
 * True kalau user punya MINIMAL SATU dari permission yang diminta.
 * Dipakai untuk halaman gabungan seperti /admin (Users, Roles & Audit Log)
 * yang boleh dibuka oleh siapa pun yang punya salah satu izin terkait.
 */
export async function userHasAnyPermission(userId: string, permissionKeys: readonly string[]): Promise<boolean> {
  if (permissionKeys.length === 0) return true;
  const owned = await getUserPermissions(userId);
  return permissionKeys.some((key) => owned.has(key));
}

/**
 * Dipakai di API routes / server actions. Melempar error 403-style
 * kalau user tidak punya permission — jangan tangkap diam-diam.
 */
export async function assertPermission(userId: string, permissionKey: string): Promise<void> {
  const allowed = await userHasPermission(userId, permissionKey);
  if (!allowed) {
    throw new PermissionError(permissionKey);
  }
}

export class PermissionError extends Error {
  constructor(permissionKey: string) {
    super(`Anda tidak memiliki akses untuk melakukan aksi ini (${permissionKey}).`);
    this.name = "PermissionError";
  }
}

// Daftar permission key tinggal di permissionKeys.ts (tanpa dependensi Prisma)
// supaya bisa di-import dari client component / konfigurasi navigasi / script
// pengujian. Di-re-export di sini agar semua import lama tetap berfungsi.
export { PERMISSIONS } from "@/lib/permissionKeys";
export type { PermissionKey } from "@/lib/permissionKeys";
