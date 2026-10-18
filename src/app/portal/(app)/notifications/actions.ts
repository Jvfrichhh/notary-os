"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccount } from "@/lib/portalSession";

// Keduanya scoped ke clientId dari session -- klien tidak bisa menandai
// notifikasi klien lain walau id-nya ditebak (updateMany dengan where clientId).
export async function markClientNotificationRead(id: string) {
  const { clientId } = await requireClientAccount();
  await prisma.clientNotification.updateMany({ where: { id, clientId }, data: { isRead: true } });
  revalidatePath("/portal/notifications");
  revalidatePath("/portal");
}

export async function markAllClientNotificationsRead() {
  const { clientId } = await requireClientAccount();
  await prisma.clientNotification.updateMany({ where: { clientId, isRead: false }, data: { isRead: true } });
  revalidatePath("/portal/notifications");
  revalidatePath("/portal");
}
