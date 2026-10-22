import { AiError, type CreateMessageInput, type MessageResponse } from "@/lib/ai/client";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-5-5";

/**
 * Satu panggilan ke model. Melempar AiError dengan pesan yang aman untuk
 * ditampilkan ke staff (tidak memuat kunci atau payload).
 */
export async function anthropicCreateMessage(input: CreateMessageInput, model: string): Promise<MessageResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError("Fitur AI belum diaktifkan: ANTHROPIC_API_KEY belum diset.");

  // Buang field `signature` (khusus Gemini) supaya API Anthropic tidak menolak field asing.
  const messages = input.messages.map((m) =>
    typeof m.content === "string"
      ? m
      : {
          role: m.role,
          content: m.content.map((b) => {
            if (b.type !== "tool_use") return b;
            return { type: b.type, id: b.id, name: b.name, input: b.input };
          })
        }
  );
  const body: Record<string, unknown> = {
    model,
    max_tokens: input.maxTokens ?? 1024,
    messages
  };
  if (input.system) body.system = input.system;
  if (input.tools && input.tools.length > 0) body.tools = input.tools;
  if (input.toolChoice) body.tool_choice = input.toolChoice;
  if (input.temperature !== undefined) body.temperature = input.temperature;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 60_000);
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new AiError(aborted ? "Layanan AI tidak merespons tepat waktu. Coba lagi." : "Tidak dapat menghubungi layanan AI.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: { message?: string } };
      detail = j.error?.message ?? "";
    } catch {
      /* abaikan */
    }
    if (res.status === 401) throw new AiError("Kunci API AI ditolak. Periksa ANTHROPIC_API_KEY.", 401);
    if (res.status === 429) throw new AiError("Kuota layanan AI sedang penuh. Coba beberapa saat lagi.", 429);
    if (res.status === 529 || res.status >= 500) throw new AiError("Layanan AI sedang sibuk. Coba lagi.", res.status);
    // Rincian teknis hanya di log server, tidak ditampilkan ke pengguna.
    console.error("[ai] permintaan ditolak", res.status, detail.slice(0, 500));
    throw new AiError(`Permintaan AI ditolak (kode ${res.status}). Coba lagi atau hubungi admin.`, res.status);
  }

  return (await res.json()) as MessageResponse;
}

