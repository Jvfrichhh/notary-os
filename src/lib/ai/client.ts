/**
 * Fasad klien model AI. Bentuk permintaan/respons mengikuti gaya Anthropic
 * Messages API (blok konten + tool use); penyedia lain (Gemini) diadaptasi ke
 * bentuk yang sama di `providers/`, sehingga fitur di atasnya tidak peduli
 * penyedia mana yang aktif.
 *
 * Memakai `fetch` bawaan Node 18+, sengaja TANPA SDK supaya tidak menambah
 * dependensi.
 *
 * Aturan pakai:
 *  - Hanya dipanggil dari server (server action / route handler). Kunci API
 *    tidak pernah sampai ke browser.
 *  - Pemanggil WAJIB sudah memeriksa izin user; modul ini tidak tahu konteks
 *    user dan tidak pernah menyentuh database.
 *  - Semua output model diperlakukan sebagai USULAN yang harus disetujui
 *    manusia; tidak ada tulisan ke database yang dipicu langsung oleh model.
 */

export type AiProvider = "anthropic" | "gemini";

/**
 * Penyedia dipilih lewat env AI_PROVIDER; bila kosong, otomatis: Anthropic
 * jika ANTHROPIC_API_KEY ada, selain itu Gemini jika GEMINI_API_KEY ada.
 * Gemini punya tingkat gratis (data boleh dipakai Google -> cocok untuk
 * pengembangan/demo dengan dokumen contoh); Anthropic berbayar dan tidak
 * memakai data API untuk pelatihan -> untuk dokumen klien sungguhan.
 */
export function aiProvider(): AiProvider | null {
  const forced = (process.env.AI_PROVIDER || "").toLowerCase();
  if (forced === "anthropic" || forced === "gemini") {
    const key = forced === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY;
    return key ? forced : null;
  }
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export function isAiEnabled(): boolean {
  return aiProvider() !== null;
}

/** Model aktif; AI_MODEL mengganti default penyedia tanpa deploy ulang. */
export function aiModel(): string {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  return aiProvider() === "gemini" ? "gemini-3.8-flash" : "claude-sonnet-5-5";
}

// ---- Tipe permintaan ------------------------------------------------------

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type ContentBlockParam =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  // `signature`: hanya dipakai adaptor Gemini (thoughtSignature yang wajib
  // dikirim balik bersama functionCall); diabaikan oleh Anthropic.
  | { type: "tool_use"; id: string; name: string; input: unknown; signature?: string }
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
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown>; signature?: string };

export interface MessageResponse {
  id: string;
  model: string;
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence" | string;
  content: ResponseBlock[];
  usage: { input_tokens: number; output_tokens: number };
}

export class AiError extends Error {
  status?: number;
  /** Saran jeda dari penyedia (header Retry-After / pesan kuota), ms. */
  retryAfterMs?: number;
  constructor(message: string, status?: number, retryAfterMs?: number) {
    super(message);
    this.name = "AiError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
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
  /**
   * Anggaran "berpikir" model (Gemini thinkingConfig). "none" untuk tugas
   * memilih tool & merangkum data (asisten) supaya jawaban cepat; "default"
   * untuk analisis dokumen yang butuh ketelitian.
   */
  thinking?: "none" | "default";
}

/**
 * Satu panggilan ke model lewat penyedia aktif. Melempar AiError dengan pesan
 * yang aman untuk ditampilkan ke staff (tidak memuat kunci atau payload).
 */
export async function createMessage(input: CreateMessageInput): Promise<MessageResponse> {
  const provider = aiProvider();
  if (!provider) throw new AiError("Fitur AI belum diaktifkan: ANTHROPIC_API_KEY atau GEMINI_API_KEY belum diset.");
  const model = aiModel();
  if (provider === "gemini") {
    const { geminiCreateMessage } = await import("@/lib/ai/providers/gemini");
    return geminiCreateMessage(input, model);
  }
  const { anthropicCreateMessage } = await import("@/lib/ai/providers/anthropic");
  return anthropicCreateMessage(input, model);
}

/**
 * createMessage dengan percobaan ulang singkat saat layanan sibuk (429 batas per
 * menit / 5xx / tidak merespons). Maksimal `retries` kali, jeda mengikuti
 * Retry-After bila ada (dibatasi `maxWaitMs`) -- supaya satu gangguan sesaat
 * tidak langsung menggagalkan jawaban ke staf.
 */
export async function createMessageWithRetry(input: CreateMessageInput, opts: { retries?: number; maxWaitMs?: number } = {}): Promise<MessageResponse> {
  const retries = opts.retries ?? 2;
  const maxWait = opts.maxWaitMs ?? 8_000;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await createMessage(input);
    } catch (err) {
      lastErr = err;
      const e = err instanceof AiError ? err : null;
      const retryable = !e || e.status === undefined || e.status === 429 || e.status >= 500;
      if (!retryable || attempt === retries) throw err;
      const hinted = e?.retryAfterMs ?? 0;
      const wait = Math.min(maxWait, Math.max(1_500 * (attempt + 1), hinted));
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
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
