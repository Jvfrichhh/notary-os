import { prisma } from "@/lib/prisma";

export type NotificationType = "assignment" | "deadline" | "overdue" | "document" | "info";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/**
 * Satu-satunya cara membuat notifikasi -- selalu lewat tabel `Notification`
 * yang sudah ada (bukan sistem eksternal / email / push).
 * Dipanggil dari action lain (mis. saat assign PIC/staff) -- bukan proses
 * terjadwal, supaya tidak butuh infrastruktur cron baru.
 */
export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId
    }
  });
}
