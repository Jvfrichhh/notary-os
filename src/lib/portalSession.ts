import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Identitas klien yang SUDAH diverifikasi server untuk satu request portal.
 * `clientId` di sini adalah satu-satunya sumber kebenaran untuk membatasi
 * query (where: { clientId }). Jangan pernah menerima clientId dari URL,
 * form, atau body request sebagai pengganti nilai ini.
 */
export interface PortalPrincipal {
  accountId: string;
  clientId: string;
  email: string;
  displayName: string;
  /** true = wajib ganti password sebelum memakai portal (akun baru / di-reset kantor). */
  mustChangePassword: boolean;
  client: { id: string; clientNumber: string; fullName: string; companyName: string | null };
}

/** Alasan akun portal ditolak; dipakai untuk pesan di /portal/login?error=... */
export type PortalDenyReason = "unauthenticated" | "not_client" | "account_inactive" | "client_inactive";

/**
 * Versi "lunak": kembalikan principal atau alasan penolakan, tanpa redirect.
 * Dipakai layout/page portal (yang lalu redirect) dan API route (yang lalu
 * balas 401/403 JSON).
 */
export async function getPortalPrincipal(): Promise<
  { ok: true; principal: PortalPrincipal } | { ok: false; reason: PortalDenyReason }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, reason: "unauthenticated" };
  if (session.user.kind !== "client") return { ok: false, reason: "not_client" };

  // Verifikasi ulang ke database pada SETIAP request -- bukan hanya percaya
  // JWT -- supaya akun yang dinonaktifkan atau klien yang diarsipkan setelah
  // login langsung kehilangan akses, tanpa menunggu token kedaluwarsa.
  const account = await prisma.clientAccount.findUnique({
    where: { id: session.user.id },
    include: {
      client: { select: { id: true, clientNumber: true, fullName: true, companyName: true, status: true } }
    }
  });

  if (!account || !account.isActive) return { ok: false, reason: "account_inactive" };
  if (account.client.status !== "ACTIVE") return { ok: false, reason: "client_inactive" };

  return {
    ok: true,
    principal: {
      accountId: account.id,
      clientId: account.client.id,
      email: account.email,
      displayName: account.name ?? account.client.fullName,
      mustChangePassword: account.mustChangePassword,
      client: {
        id: account.client.id,
        clientNumber: account.client.clientNumber,
        fullName: account.client.fullName,
        companyName: account.client.companyName
      }
    }
  };
}

/**
 * Dipakai di awal setiap server component / server action PORTAL.
 * - Belum login            -> /portal/login
 * - Login sebagai staff    -> /dashboard (staff tidak memakai portal)
 * - Akun/klien nonaktif    -> /portal/login?error=<alasan> (halaman login
 *                             menampilkan pesan dan tombol keluar)
 */
export const PORTAL_CHANGE_PASSWORD_PATH = "/portal/account/password";

export async function requireClientAccount(opts: { allowPendingPasswordChange?: boolean } = {}): Promise<PortalPrincipal> {
  const result = await getPortalPrincipal();
  if (result.ok) {
    // Gerbang ganti password: akun baru / di-reset kantor hanya boleh membuka
    // halaman ganti password (dan layout). Berlaku juga untuk server action.
    if (result.principal.mustChangePassword && !opts.allowPendingPasswordChange) {
      redirect(PORTAL_CHANGE_PASSWORD_PATH);
    }
    return result.principal;
  }

  if (result.reason === "not_client") redirect("/dashboard");
  if (result.reason === "unauthenticated") redirect("/portal/login");
  redirect(`/portal/login?error=${result.reason}`);
}
