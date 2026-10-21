// Kompatibilitas: helper password kini di lib/passwords.ts (dipakai juga
// untuk akun internal). Nama lama tetap diekspor.
export { generateTemporaryPassword, validateNewPassword } from "@/lib/passwords";
export { hashPassword as hashPortalPassword } from "@/lib/passwords";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { cookies } from "next/headers";
import { generateTemporaryPassword as genPw } from "@/lib/passwords";
import { hashPassword } from "@/lib/passwords";

/**
 * Buat akun portal untuk klien baru (dipanggil dari Tambah Klien). Pemanggil
 * wajib sudah memeriksa izin edit_clients. Password sementara dititipkan di
 * cookie httpOnly berumur pendek khusus halaman tujuan, supaya bisa
 * ditampilkan sekali ke Notaris tanpa masuk ke URL atau log.
 */
export async function createPortalAccountForNewClient(params: {
  clientId: string;
  email: string;
  name: string;
  userId: string;
  showOnPath: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const email = params.email.trim().toLowerCase();
  if (await prisma.clientAccount.findUnique({ where: { email }, select: { id: true } })) {
    return { ok: false, reason: "email sudah dipakai akun portal lain" };
  }
  const temporaryPassword = genPw();
  const account = await prisma.clientAccount.create({
    data: { clientId: params.clientId, email, name: params.name, passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true },
    select: { id: true, email: true }
  });
  await writeAuditLog({
    userId: params.userId,
    action: "client_portal_account_created",
    entityType: "ClientAccount",
    entityId: account.id,
    newValue: { clientId: params.clientId, email: account.email }
  });
  cookies().set("portal_new_account", JSON.stringify({ email: account.email, pw: temporaryPassword }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: params.showOnPath,
    maxAge: 300
  });
  return { ok: true };
}

/** Baca kredensial portal baru (hanya di halaman tujuan, maks. 5 menit). */
export function readNewPortalAccount(): { email: string; pw: string } | null {
  const raw = cookies().get("portal_new_account")?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { email?: string; pw?: string };
    return v.email && v.pw ? { email: v.email, pw: v.pw } : null;
  } catch {
    return null;
  }
}
