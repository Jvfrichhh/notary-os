import { prisma } from "@/lib/prisma";

export type ClientNotificationType = "document_reviewed" | "status_changed" | "info";

interface CreateClientNotificationInput {
  clientId: string;
  type: ClientNotificationType;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/**
 * Satu-satunya cara membuat notifikasi untuk KLIEN (portal). Terikat ke
 * clients.id, bukan akun -- semua akun portal milik klien itu melihatnya.
 * Dipanggil dari server action internal (mis. saat staff memeriksa dokumen
 * atau mengubah status job).
 */
export async function createClientNotification(input: CreateClientNotificationInput) {
  return prisma.clientNotification.create({
    data: {
      clientId: input.clientId,
      type: input.type,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId
    }
  });
}
