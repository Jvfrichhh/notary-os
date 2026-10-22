"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hashPassword, validateNewPassword } from "@/lib/passwords";
import { writeAuditLog } from "@/lib/audit";
import type { ChangePasswordState } from "@/components/portal/ChangePasswordForm";

/** Akun INTERNAL mengganti password-nya sendiri (wajib tahu password saat ini). */
export async function changeOwnPassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await requireUser();

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next || !confirm) return { error: "Semua kolom wajib diisi." };
  if (next !== confirm) return { error: "Konfirmasi password tidak sama." };
  const rule = validateNewPassword(next);
  if (rule) return { error: rule };
  if (next === current) return { error: "Password baru harus berbeda dari password saat ini." };

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, email: true } });
  if (!row || !(await bcrypt.compare(current, row.passwordHash))) return { error: "Password saat ini salah." };

  // activeSessionId dikosongkan: semua sesi lama (termasuk yang mungkin dicuri)
  // langsung gugur; form login ulang otomatis dengan password baru.
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next), activeSessionId: null } });
  await writeAuditLog({ userId: user.id, action: "user_password_changed", entityType: "User", entityId: user.id });

  return { relogin: { provider: "credentials", email: row.email, redirectTo: "/dashboard?password=changed" } };
}
