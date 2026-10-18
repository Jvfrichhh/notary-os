// Kompatibilitas: helper password kini di lib/passwords.ts (dipakai juga
// untuk akun internal). Nama lama tetap diekspor.
export { generateTemporaryPassword, validateNewPassword } from "@/lib/passwords";
export { hashPassword as hashPortalPassword } from "@/lib/passwords";
