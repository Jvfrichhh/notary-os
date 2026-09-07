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

// Daftar permission — dijaga sinkron dengan prisma/seed.ts
export const PERMISSIONS = {
  VIEW_CLIENTS: "view_clients",
  CREATE_CLIENTS: "create_clients",
  EDIT_CLIENTS: "edit_clients",
  DELETE_CLIENTS: "delete_clients",
  VIEW_VISITS: "view_visits",
  CREATE_VISITS: "create_visits",
  VIEW_JOBS: "view_jobs",
  CREATE_JOBS: "create_jobs",
  EDIT_JOBS: "edit_jobs",
  DELETE_JOBS: "delete_jobs",
  VIEW_DOCUMENTS: "view_documents",
  UPLOAD_DOCUMENTS: "upload_documents",
  DELETE_DOCUMENTS: "delete_documents",
  VIEW_FINANCE: "view_finance",
  EDIT_FINANCE: "edit_finance",
  VIEW_MINUTA: "view_minuta",
  EDIT_MINUTA: "edit_minuta",
  VIEW_REPERTORIUM: "view_repertorium",
  EDIT_REPERTORIUM: "edit_repertorium",
  VIEW_LEGALISASI: "view_legalisasi",
  EDIT_LEGALISASI: "edit_legalisasi",
  VIEW_WAARMERKING: "view_waarmerking",
  EDIT_WAARMERKING: "edit_waarmerking",
  VIEW_WASIAT: "view_wasiat",
  EDIT_WASIAT: "edit_wasiat",
  VIEW_AUDIT_LOG: "view_audit_log",
  MANAGE_USERS: "manage_users",
  MANAGE_ROLES: "manage_roles"
} as const;
