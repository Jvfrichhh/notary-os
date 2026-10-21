"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/** Klik notifikasi di portal: tandai dibaca lalu buka pekerjaan terkait. */
export async function openClientNotification(id: string) {
  const { clientId } = await requireClientAccount();
  const n = await prisma.clientNotification.findFirst({
    where: { id, clientId },
    select: { isRead: true, relatedEntityType: true, relatedEntityId: true }
  });
  if (!n) redirect("/portal/notifications");
  if (!n.isRead) {
    await prisma.clientNotification.update({ where: { id }, data: { isRead: true } });
    revalidatePath("/portal", "layout");
  }
  redirect(n.relatedEntityType === "Job" && n.relatedEntityId ? `/portal/jobs/${n.relatedEntityId}` : "/portal/notifications");
}
