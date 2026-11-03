"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export interface ProfileState {
  ok?: string;
  error?: string;
}

/** Pengguna mengubah nama tampilannya sendiri (email & peran hanya admin). */
export async function updateOwnProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2) return { error: "Nama minimal 2 karakter." };
  if (name.length > 80) return { error: "Nama maksimal 80 karakter." };
  const before = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  if (!before) return { error: "Akun tidak ditemukan." };
  if (before.name === name) return { ok: "Tidak ada perubahan." };
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  await writeAuditLog({ userId: user.id, action: "user_profile_updated", entityType: "User", entityId: user.id, previousValue: { name: before.name }, newValue: { name } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: "Nama tersimpan dan sudah berlaku di seluruh aplikasi." };
}

/** Keluar dari semua perangkat lain: sesi lama digugurkan (sesi ini ikut gugur, diarahkan login lagi). */
export async function signOutEverywhere(): Promise<{ ok: true }> {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { activeSessionId: null } });
  await writeAuditLog({ userId: user.id, action: "user_sessions_revoked", entityType: "User", entityId: user.id });
  return { ok: true };
}
