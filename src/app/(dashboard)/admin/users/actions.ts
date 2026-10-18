"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { generateTemporaryPassword, hashPassword } from "@/lib/passwords";

/**
 * Pengelolaan AKUN INTERNAL (users). Semua butuh izin manage_users.
 * Password sementara dikembalikan ke UI sekali, tidak disimpan plain,
 * tidak masuk audit log.
 *
 * Pengaman:
 *  - Tidak bisa menonaktifkan diri sendiri.
 *  - Tidak bisa menonaktifkan / menurunkan role NOTARY aktif terakhir
 *    (supaya kantor tidak kehilangan akses admin tertinggi).
 */

export interface UserAdminState {
  error?: string;
  success?: string;
  temporaryPassword?: string;
  email?: string;
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  phone: z.string().trim().max(30).optional(),
  roleId: z.string().min(1, "Pilih role.")
});

async function countActiveNotaries(excludeUserId?: string) {
  return prisma.user.count({
    where: { isActive: true, role: { name: "NOTARY" }, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) }
  });
}

export async function createInternalUser(_prev: UserAdminState, formData: FormData): Promise<UserAdminState> {
  const admin = await requireUser();
  await assertPermission(admin.id, PERMISSIONS.MANAGE_USERS);

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    roleId: formData.get("roleId")
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };

  const role = await prisma.role.findUnique({ where: { id: parsed.data.roleId }, select: { id: true, name: true } });
  if (!role) return { error: "Role tidak ditemukan." };
  if (await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })) {
    return { error: "Email ini sudah dipakai akun lain." };
  }

  const temporaryPassword = generateTemporaryPassword();
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      roleId: role.id,
      passwordHash: await hashPassword(temporaryPassword)
    },
    select: { id: true, email: true }
  });

  await writeAuditLog({
    userId: admin.id,
    action: "user_created",
    entityType: "User",
    entityId: user.id,
    newValue: { email: user.email, role: role.name }
  });

  revalidatePath("/admin/users");
  return {
    success: `Akun ${user.email} (${role.name}) dibuat. Sampaikan password sementara ini kepada yang bersangkutan — hanya ditampilkan sekali; minta ia menggantinya lewat ikon kunci di header.`,
    temporaryPassword,
    email: user.email
  };
}

export async function resetInternalUserPassword(userId: string, _prev: UserAdminState, _formData: FormData): Promise<UserAdminState> {
  const admin = await requireUser();
  await assertPermission(admin.id, PERMISSIONS.MANAGE_USERS);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) return { error: "User tidak ditemukan." };

  const temporaryPassword = generateTemporaryPassword();
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(temporaryPassword) } });
  await writeAuditLog({ userId: admin.id, action: "user_password_reset", entityType: "User", entityId: user.id, newValue: { email: user.email } });

  revalidatePath("/admin/users");
  return {
    success: `Password ${user.email} di-reset. Password sementara (hanya ditampilkan sekali):`,
    temporaryPassword,
    email: user.email
  };
}

export async function setInternalUserActive(userId: string, isActive: boolean): Promise<void> {
  const admin = await requireUser();
  await assertPermission(admin.id, PERMISSIONS.MANAGE_USERS);
  if (userId === admin.id) return; // tidak boleh menonaktifkan diri sendiri

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, isActive: true, role: { select: { name: true } } } });
  if (!user || user.isActive === isActive) return;
  if (!isActive && user.role.name === "NOTARY" && (await countActiveNotaries(user.id)) === 0) return; // NOTARY aktif terakhir

  await prisma.user.update({ where: { id: user.id }, data: { isActive } });
  await writeAuditLog({
    userId: admin.id,
    action: isActive ? "user_activated" : "user_deactivated",
    entityType: "User",
    entityId: user.id,
    previousValue: { isActive: user.isActive },
    newValue: { isActive }
  });
  revalidatePath("/admin/users");
}

export async function changeInternalUserRole(userId: string, formData: FormData): Promise<void> {
  const admin = await requireUser();
  await assertPermission(admin.id, PERMISSIONS.MANAGE_USERS);
  const roleId = String(formData.get("roleId") ?? "");
  if (!roleId) return;

  const [user, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, isActive: true, roleId: true, role: { select: { name: true } } } }),
    prisma.role.findUnique({ where: { id: roleId }, select: { id: true, name: true } })
  ]);
  if (!user || !role || user.roleId === role.id) return;
  // Menurunkan NOTARY aktif terakhir ke role lain -> tolak.
  if (user.role.name === "NOTARY" && role.name !== "NOTARY" && user.isActive && (await countActiveNotaries(user.id)) === 0) return;

  await prisma.user.update({ where: { id: user.id }, data: { roleId: role.id } });
  await writeAuditLog({
    userId: admin.id,
    action: "user_role_changed",
    entityType: "User",
    entityId: user.id,
    previousValue: { role: user.role.name },
    newValue: { role: role.name }
  });
  revalidatePath("/admin/users");
}
