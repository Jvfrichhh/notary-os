import { prisma } from "@/lib/prisma";

interface WriteAuditLogInput {
  userId?: string | null;
  action: string; // e.g. "status_changed", "document_uploaded", "deadline_edited"
  entityType: string; // e.g. "Job", "Document", "Payment"
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
}

/**
 * Satu-satunya cara menulis audit log di seluruh aplikasi.
 * audit_logs bersifat append-only — tidak ada updateAuditLog / deleteAuditLog
 * yang diekspos secara sengaja (blueprint §10).
 */
export async function writeAuditLog(input: WriteAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      previousValue: input.previousValue as never,
      newValue: input.newValue as never
    }
  });
}
