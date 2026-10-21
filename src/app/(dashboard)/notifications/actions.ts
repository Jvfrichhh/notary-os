"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notificationHref } from "@/lib/notificationLinks";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  // Sengaja scoped ke userId sendiri -- notifikasi cuma boleh ditandai
  // oleh pemiliknya, tidak ada permission tambahan yang relevan di sini.
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true }
  });
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true }
  });
  revalidatePath("/notifications");
}

/**
 * Klik notifikasi: tandai dibaca lalu buka halaman terkait. Tujuan dihitung
 * di server dari data notifikasi milik user sendiri (bukan dari input form).
 */
export async function openNotification(id: string) {
  const user = await requireUser();
  const n = await prisma.notification.findFirst({
    where: { id, userId: user.id },
    select: { isRead: true, relatedEntityType: true, relatedEntityId: true }
  });
  if (!n) redirect("/notifications");
  if (!n.isRead) {
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    revalidatePath("/notifications", "layout");
  }
  redirect(notificationHref(n.relatedEntityType, n.relatedEntityId) ?? "/notifications");
}
