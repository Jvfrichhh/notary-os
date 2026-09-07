"use server";

import { revalidatePath } from "next/cache";
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
