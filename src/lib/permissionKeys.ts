/**
 * Daftar permission key — dijaga sinkron dengan prisma/seed.ts.
 *
 * File ini SENGAJA tidak meng-import apa pun (terutama Prisma) supaya aman
 * dipakai di client component, konfigurasi navigasi (lib/navigation.ts),
 * dan script pengujian. Logika pengecekan ke database ada di permissions.ts.
 */
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

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
