import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { userHasAnyPermission, userHasPermission } from "@/lib/permissions";

/**
 * Tujuan redirect saat user login tapi TIDAK punya izin membuka halaman.
 * Dashboard membaca query `denied=1` dan menampilkan pemberitahuan singkat,
 * supaya user tahu kenapa ia "terlempar" -- bukan sekadar pindah halaman diam-diam.
 */
export const ACCESS_DENIED_REDIRECT = "/dashboard?denied=1";

/**
 * Dipakai di server components / server actions untuk ambil user yang login.
 * Middleware sudah menjaga route, jadi ini seharusnya selalu ada -- tapi tetap
 * redirect ke /login sebagai fallback kalau session somehow kosong.
 */
export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  // Akun PORTAL KLIEN bukan user internal: tidak punya Role/Permission dan
  // tidak boleh menyentuh halaman, server action, maupun API internal.
  // Middleware sudah memblokir di level route; ini lapis kedua (defense in
  // depth) untuk server action yang dipanggil langsung.
  if (session.user.kind === "client") {
    redirect("/portal");
  }
  return session.user;
}

/**
 * Sama seperti requireUser(), tapi juga memastikan user punya permission
 * tertentu. Dipakai di awal server component / server action sebelum
 * baca/tulis data yang di-guard. Redirect ke /dashboard kalau tidak punya akses
 * (server component), atau lempar PermissionError kalau dipanggil dari action
 * lewat assertPermission langsung -- gunakan sesuai konteks.
 */
export async function requirePermission(permissionKey: string) {
  const user = await requireUser();
  const allowed = await userHasPermission(user.id, permissionKey);
  if (!allowed) {
    redirect(ACCESS_DENIED_REDIRECT);
  }
  return user;
}

/**
 * Versi "salah satu dari": lolos kalau user punya MINIMAL SATU permission
 * dari daftar. Dipakai halaman gabungan seperti /admin yang relevan untuk
 * manage_users, manage_roles, maupun view_audit_log.
 */
export async function requireAnyPermission(permissionKeys: readonly string[]) {
  const user = await requireUser();
  const allowed = await userHasAnyPermission(user.id, permissionKeys);
  if (!allowed) {
    redirect(ACCESS_DENIED_REDIRECT);
  }
  return user;
}
