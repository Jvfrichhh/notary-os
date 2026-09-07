import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { userHasPermission } from "@/lib/permissions";

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
    redirect("/dashboard");
  }
  return user;
}
