"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { generateTemporaryPassword, hashPortalPassword } from "@/lib/portalAccounts";

/**
 * Pengelolaan AKSES PORTAL KLIEN oleh kantor. Semua butuh izin edit_clients
 * (NOTARY & ADMIN pada seed bawaan). Klien tidak pernah mendaftar sendiri:
 * akun dibuat dari data Client yang sudah ada, lalu kredensial sementara
 * disampaikan kantor ke klien dan WAJIB diganti saat login pertama.
 *
 * Password sementara dikembalikan ke UI SEKALI (tidak disimpan plain, tidak
 * ditulis ke audit log).
 */

export interface PortalAccountActionState {
  error?: string;
  success?: string;
  /** Hanya terisi tepat setelah buat/reset; tampilkan sekali. */
  temporaryPassword?: string;
  email?: string;
}

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  name: z.string().trim().max(120).optional()
});

export async function createClientPortalAccount(
  clientId: string,
  _prev: PortalAccountActionState,
  formData: FormData
): Promise<PortalAccountActionState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_CLIENTS);

  const parsed = createSchema.safeParse({ email: formData.get("email"), name: formData.get("name") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, status: true, fullName: true } });
  if (!client) return { error: "Klien tidak ditemukan." };
  if (client.status !== "ACTIVE") return { error: "Klien tidak aktif; aktifkan dulu sebelum membuat akses portal." };

  const existing = await prisma.clientAccount.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existing) return { error: "Email ini sudah dipakai akun portal lain." };

  const temporaryPassword = generateTemporaryPassword();
  const account = await prisma.clientAccount.create({
    data: {
      clientId: client.id,
      email: parsed.data.email,
      name: parsed.data.name || client.fullName,
      passwordHash: await hashPortalPassword(temporaryPassword),
      mustChangePassword: true
    },
    select: { id: true, email: true }
  });

  await writeAuditLog({
    userId: user.id,
    action: "client_portal_account_created",
    entityType: "ClientAccount",
    entityId: account.id,
    newValue: { clientId: client.id, email: account.email }
  });

  revalidatePath(`/clients/${client.id}`);
  return {
    success: `Akses portal dibuat untuk ${account.email}. Sampaikan password sementara di bawah ini ke klien — hanya ditampilkan sekali.`,
    temporaryPassword,
    email: account.email
  };
}

export async function resetClientPortalPassword(
  accountId: string,
  _prev: PortalAccountActionState,
  _formData: FormData
): Promise<PortalAccountActionState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_CLIENTS);

  const account = await prisma.clientAccount.findUnique({ where: { id: accountId }, select: { id: true, email: true, clientId: true } });
  if (!account) return { error: "Akun tidak ditemukan." };

  const temporaryPassword = generateTemporaryPassword();
  await prisma.clientAccount.update({
    where: { id: account.id },
    data: { passwordHash: await hashPortalPassword(temporaryPassword), mustChangePassword: true }
  });

  await writeAuditLog({
    userId: user.id,
    action: "client_portal_password_reset",
    entityType: "ClientAccount",
    entityId: account.id,
    newValue: { email: account.email }
  });

  revalidatePath(`/clients/${account.clientId}`);
  return {
    success: `Password ${account.email} di-reset. Sampaikan password sementara di bawah ini ke klien — hanya ditampilkan sekali.`,
    temporaryPassword,
    email: account.email
  };
}

export async function setClientPortalAccountActive(accountId: string, isActive: boolean) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_CLIENTS);

  const account = await prisma.clientAccount.findUnique({ where: { id: accountId }, select: { id: true, email: true, clientId: true, isActive: true } });
  if (!account || account.isActive === isActive) return;

  await prisma.clientAccount.update({ where: { id: account.id }, data: { isActive } });
  await writeAuditLog({
    userId: user.id,
    action: isActive ? "client_portal_account_activated" : "client_portal_account_deactivated",
    entityType: "ClientAccount",
    entityId: account.id,
    previousValue: { isActive: account.isActive },
    newValue: { isActive }
  });
  revalidatePath(`/clients/${account.clientId}`);
}
