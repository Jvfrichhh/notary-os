"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getUserPermissions } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissionKeys";
import { writeAuditLog } from "@/lib/audit";
import { AiError, isAiEnabled } from "@/lib/ai/client";
import { askAssistant, type ChatTurn } from "@/lib/ai/assistant";

export interface AskResult {
  answer?: string;
  error?: string;
  toolsUsed?: string[];
}

const MAX_QUESTION = 1000;

/**
 * Satu giliran percakapan. Riwayat disimpan di browser (bukan database) dan
 * dikirim ulang tiap giliran; hanya pertanyaan yang dicatat ke audit log,
 * bukan jawabannya (jawaban bisa memuat data klien).
 */
export async function askAssistantAction(history: ChatTurn[], question: string): Promise<AskResult> {
  const user = await requireUser();
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has(PERMISSIONS.VIEW_JOBS)) return { error: "Anda tidak berhak memakai Asisten AI." };
  if (!isAiEnabled()) return { error: "Fitur AI belum diaktifkan di server." };

  // Batas pemakaian per orang: 60 pertanyaan per jam (cegah biaya AI membengkak).
  const asked = await prisma.auditLog.count({
    where: { action: "ai_assistant_asked", userId: user.id, timestamp: { gte: new Date(Date.now() - 3600 * 1000) } }
  });
  if (asked >= 60) return { error: "Batas pertanyaan ke Asisten (60 per jam) tercapai. Coba lagi nanti." };

  const q = String(question ?? "").trim().slice(0, MAX_QUESTION);
  if (!q) return { error: "Pertanyaan kosong." };
  const safeHistory: ChatTurn[] = Array.isArray(history)
    ? history
        .filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
        .map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }))
    : [];

  try {
    const res = await askAssistant(safeHistory, q, { userId: user.id, userName: user.name ?? "Staf", permissions });
    await writeAuditLog({
      userId: user.id,
      action: "ai_assistant_asked",
      entityType: "Assistant",
      entityId: user.id,
      newValue: { question: q.slice(0, 300), toolsUsed: res.toolsUsed, inputTokens: res.inputTokens, outputTokens: res.outputTokens }
    });
    return { answer: res.answer, toolsUsed: res.toolsUsed };
  } catch (err) {
    // Pertanyaan yang gagal (timeout/gangguan) tetap memakai kuota AI, jadi ikut
    // dicatat agar batas 60/jam juga menghitungnya. Gagal mencatat tidak boleh
    // menutupi pesan error aslinya.
    await writeAuditLog({
      userId: user.id,
      action: "ai_assistant_asked",
      entityType: "Assistant",
      entityId: user.id,
      newValue: { question: q.slice(0, 300), failed: true }
    }).catch(() => undefined);
    if (err instanceof AiError) return { error: err.message };
    console.error("[ai] askAssistant gagal", err);
    return { error: "Asisten mengalami gangguan. Coba lagi." };
  }
}
