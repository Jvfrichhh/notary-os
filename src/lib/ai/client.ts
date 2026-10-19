/**
 * Klien tipis untuk Anthropic Messages API, memakai `fetch` bawaan Node 18+.
 *
 * Sengaja TANPA SDK supaya tidak menambah dependensi: permukaan API yang
 * dipakai aplikasi ini kecil (teks, gambar/PDF sebagai input, dan tool use).
 *
 * Aturan pakai:
 *  - Hanya dipanggil dari server (server action / route handler). Kunci API
 *    tidak pernah sampai ke browser.
 *  - Pemanggil WAJIB sudah memeriksa izin user; modul ini tidak tahu konteks
 *    user dan tidak pernah menyentuh database.
 *  - Semua output model diperlakukan sebagai USULAN yang harus disetujui
 *    manusia; tidak ada tulisan ke database yang dipicu langsung oleh model.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
// Bisa diganti lewat env AI_MODEL tanpa deploy ulang (mis. claude-haiku-5-5 untuk hemat biaya).
export const DEFAULT_MODEL = "claude-sonnet-5-5";

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function aiModel(): string {
  return process.env.AI_MODEL || DEFAULT_MODEL;
}

// ---- Tipe permintaan ------------------------------------------------------

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type ContentBlockParam =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface MessageParam {
  role: "user" | "assistant";
  content: string | ContentBlockParam[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// ---- Tipe respons ---------------------------------------------------------

export type ResponseBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

export interface MessageResponse {
  id: string;
  model: string;
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence" | string;
  content: ResponseBlock[];
  usage: { input_tokens: number; output_tokens: number };
}

export class AiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
}

export interface CreateMessageInput {
  system?: string;
  messages: MessageParam[];
  tools?: ToolDefinition[];
  /** Paksa model menjawab lewat satu tool tertentu (untuk output JSON terstruktur). */
  toolChoice?: { type: "tool"; name: string } | { type: "auto" } | { type: "any" };
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

/**
 * Satu panggilan ke model. Melempar AiError dengan pesan yang aman untuk
 * ditampilkan ke staff (tidak memuat kunci atau payload).
 */
export async function createMessage(input: CreateMessageInput): Promise<MessageResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError("Fitur AI belum diaktifkan: ANTHROPIC_API_KEY belum diset.");

  const body: Record<string, unknown> = {
    model: aiModel(),
    max_tokens: input.maxTokens ?? 1024,
    messages: input.messages
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
    throw new AiError(`Permintaan AI ditolak (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}.`, res.status);
  }

  return (await res.json()) as MessageResponse;
}

/** Ambil input dari blok tool_use pertama bernama `name` (pola "JSON lewat tool"). */
export function firstToolInput<T = Record<string, unknown>>(res: MessageResponse, name: string): T | null {
  const block = res.content.find((b) => b.type === "tool_use" && b.name === name);
  return block && block.type === "tool_use" ? (block.input as T) : null;
}

/** Gabungkan semua blok teks jadi satu string. */
export function textOf(res: MessageResponse): string {
  return res.content
    .filter((b): b is Extract<ResponseBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
