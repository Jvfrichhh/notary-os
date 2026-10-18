"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/portalSession";
import { hashPortalPassword, validateNewPassword } from "@/lib/portalAccounts";
import { writeAuditLog } from "@/lib/audit";

export interface ChangePasswordState {
  error?: string;
}

/**
 * Klien mengganti password-nya sendiri. Wajib tahu password saat ini
 * (termasuk password sementara dari kantor). Setelah berhasil,
 * mustChangePassword = false dan klien diarahkan ke beranda portal.
 */
export async function changePortalPassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const principal = await requireClientAccount({ allowPendingPasswordChange: true });

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next || !confirm) return { error: "Semua kolom wajib diisi." };
  if (next !== confirm) return { error: "Konfirmasi password tidak sama." };
  const rule = validateNewPassword(next);
  if (rule) return { error: rule };
  if (next === current) return { error: "Password baru harus berbeda dari password saat ini." };

  const account = await prisma.clientAccount.findUnique({ where: { id: principal.accountId }, select: { passwordHash: true } });
  if (!account || !(await bcrypt.compare(current, account.passwordHash))) {
    return { error: "Password saat ini salah." };
  }

  await prisma.clientAccount.update({
    where: { id: principal.accountId },
    data: { passwordHash: await hashPortalPassword(next), mustChangePassword: false }
  });
  await writeAuditLog({
    userId: null,
    action: "client_portal_password_changed",
    entityType: "ClientAccount",
    entityId: principal.accountId,
    newValue: { clientAccountId: principal.accountId }
  });

  redirect("/portal?password=changed");
}
