import { prisma } from "@/lib/prisma";

interface WriteAuditLogInput {
  userId?: string | null;
  action: string; // e.g. "status_changed", "document_uploaded", "deadline_edited"
  entityType: string; // e.g. "Job", "Document", "Payment"
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
}

// Kolom yang tidak boleh tersimpan utuh di audit log (data pribadi / rahasia).
const SECRET_KEYS = new Set(["passwordhash", "activesessionid", "password", "temporarypassword", "token"]);
const PERSONAL_ID = /^(nik|npwp|nomorktp|ktp|nokk|kk|nikpasangan|npwppasangan)$/i;

function maskId(v: unknown): unknown {
  if (typeof v !== "string" || !v) return v;
  const digits = v.replace(/\s/g, "");
  return digits.length <= 4 ? "****" : `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

/**
 * Samarkan NIK/NPWP (sisakan 4 digit terakhir) dan buang hash password /
 * penanda sesi sebelum disimpan. Berlaku untuk semua pemanggil.
 */
export function redactForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redactForAudit(v, depth + 1));
  // Hanya objek biasa yang ditelusuri; Date, Decimal, dll. dibiarkan apa adanya.
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (SECRET_KEYS.has(key)) continue;
      out[k] = PERSONAL_ID.test(k) ? maskId(v) : redactForAudit(v, depth + 1);
    }
    return out;
  }
  return value;
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
      previousValue: redactForAudit(input.previousValue) as never,
      newValue: redactForAudit(input.newValue) as never
    }
  });
}
