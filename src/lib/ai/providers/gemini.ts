import {
  AiError,
  type ContentBlockParam,
  type CreateMessageInput,
  type MessageParam,
  type MessageResponse,
  type ResponseBlock,
  type ToolDefinition
} from "@/lib/ai/client";

/**
 * Adapter Google Gemini (generateContent REST) ke bentuk MessageResponse
 * yang dipakai aplikasi. Gratis di tingkat Free (dengan batas permintaan dan
 * data boleh dipakai Google untuk perbaikan produk) -> cocok untuk
 * pengembangan/demo; untuk dokumen klien sungguhan pakai tingkat berbayar
 * atau penyedia lain.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart = (
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: unknown } }
  | { functionResponse: { name: string; response: unknown } }
) & {
  /** Model "berpikir" (Gemini 3.x) menyertakan ini pada functionCall; WAJIB dikirim balik apa adanya. */
  thoughtSignature?: string;
  /** true = bagian pemikiran internal model; tidak ditampilkan dan tidak dikirim balik. */
  thought?: boolean;
};

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

/**
 * Gemini memakai subset OpenAPI: tidak menerima `type: ["string","null"]`,
 * jadi diubah ke `type: "string", nullable: true`; kunci yang tidak dikenal
 * dibuang supaya permintaan tidak ditolak.
 */
function toGeminiSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return { type: "string" };
  const s = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  let type = s.type;
  if (Array.isArray(type)) {
    const nonNull = type.filter((t) => t !== "null");
    if (nonNull.length !== type.length) out.nullable = true;
    type = nonNull[0] ?? "string";
  }
  if (typeof type === "string") out.type = type.toUpperCase();
  if (typeof s.description === "string") out.description = s.description;
  if (Array.isArray(s.enum)) out.enum = s.enum.map(String);
  if (s.properties && typeof s.properties === "object") {
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s.properties as Record<string, unknown>)) props[k] = toGeminiSchema(v);
    out.properties = props;
  }
  if (Array.isArray(s.required) && s.required.length) out.required = s.required;
  if (s.items) out.items = toGeminiSchema(s.items);
  if (typeof s.minimum === "number") out.minimum = s.minimum;
  if (typeof s.maximum === "number") out.maximum = s.maximum;
  // Gemini menolak OBJECT tanpa properties; beri placeholder kosong yang valid.
  if (out.type === "OBJECT" && !out.properties) out.properties = {};
  return out;
}

function toGeminiTools(tools: ToolDefinition[]) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: toGeminiSchema(t.input_schema)
      }))
    }
  ];
}

/** Terjemahkan riwayat pesan; functionResponse butuh NAMA tool, dipetakan dari id tool_use sebelumnya. */
function toGeminiContents(messages: MessageParam[]): GeminiContent[] {
  const idToName = new Map<string, string>();
  const out: GeminiContent[] = [];
  for (const m of messages) {
    const role: "user" | "model" = m.role === "assistant" ? "model" : "user";
    const parts: GeminiPart[] = [];
    const blocks: ContentBlockParam[] = typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content;
    for (const b of blocks) {
      switch (b.type) {
        case "text":
          if (b.text) parts.push({ text: b.text });
          break;
        case "image":
        case "document":
          parts.push({ inlineData: { mimeType: b.source.media_type, data: b.source.data } });
          break;
        case "tool_use":
          idToName.set(b.id, b.name);
          parts.push({
            functionCall: { name: b.name, args: b.input ?? {} },
            ...(b.signature ? { thoughtSignature: b.signature } : {})
          });
          break;
        case "tool_result": {
          const name = idToName.get(b.tool_use_id) ?? "tool";
          let response: unknown;
          try {
            response = JSON.parse(b.content);
          } catch {
            response = b.content;
          }
          // Gemini mengharapkan objek; bungkus nilai non-objek.
          const wrapped = response && typeof response === "object" && !Array.isArray(response) ? response : { result: response };
          parts.push({ functionResponse: { name, response: b.is_error ? { error: wrapped } : wrapped } });
          break;
        }
      }
    }
    if (parts.length) out.push({ role, parts });
  }
  return out;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  promptFeedback?: { blockReason?: string };
  error?: {
    message?: string;
    details?: {
      "@type"?: string;
      retryDelay?: string; // mis. "37s"
      violations?: { quotaMetric?: string; quotaId?: string; quotaValue?: string }[];
    }[];
  };
}

/** Susun pesan yang menyebut jenis batas (per menit / per hari) dan lama tunggu, dari detail error Google. */
function quotaMessage(err: GeminiResponse["error"]): string {
  const details = err?.details ?? [];
  const violation = details.flatMap((d) => d.violations ?? [])[0];
  const retry = details.find((d) => d.retryDelay)?.retryDelay;
  const id = `${violation?.quotaId ?? ""} ${violation?.quotaMetric ?? ""}`.toLowerCase();
  const perDay = /perday|per_day|daily/.test(id);
  const perMinute = /perminute|per_minute/.test(id);
  const limit = violation?.quotaValue ? ` (batas ${violation.quotaValue})` : "";
  if (perDay) return `Kuota HARIAN paket gratis Gemini habis${limit}. Pulih besok sekitar pukul 14.00–15.00 WIB.`;
  const wait = retry ? ` Coba lagi dalam ${retry.replace(/s$/, " detik")}.` : " Tunggu sekitar satu menit lalu coba lagi.";
  if (perMinute) return `Batas PER MENIT paket gratis Gemini tercapai${limit}.${wait}`;
  return `Batas pemakaian gratis Gemini tercapai${limit}.${wait}`;
}

export async function geminiCreateMessage(input: CreateMessageInput, model: string): Promise<MessageResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("Fitur AI belum diaktifkan: GEMINI_API_KEY belum diset.");

  const body: Record<string, unknown> = {
    contents: toGeminiContents(input.messages),
    generationConfig: {
      maxOutputTokens: input.maxTokens ?? 1024,
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {})
    }
  };
  if (input.system) body.systemInstruction = { parts: [{ text: input.system }] };
  if (input.tools && input.tools.length > 0) {
    body.tools = toGeminiTools(input.tools);
    const tc = input.toolChoice;
    if (tc?.type === "tool") body.toolConfig = { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [tc.name] } };
    else if (tc?.type === "any") body.toolConfig = { functionCallingConfig: { mode: "ANY" } };
    else body.toolConfig = { functionCallingConfig: { mode: "AUTO" } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 60_000);
  let res: Response;
  try {
    res = await fetch(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new AiError(aborted ? "Layanan AI tidak merespons tepat waktu. Coba lagi." : "Tidak dapat menghubungi layanan AI.");
  } finally {
    clearTimeout(timer);
  }

  let json: GeminiResponse;
  try {
    json = (await res.json()) as GeminiResponse;
  } catch {
    throw new AiError(`Respons layanan AI tidak terbaca (${res.status}).`, res.status);
  }
  if (!res.ok) {
    const detail = json.error?.message ?? "";
    if (res.status === 400 && /API key/i.test(detail)) throw new AiError("Kunci API Gemini ditolak. Periksa GEMINI_API_KEY.", 400);
    if (res.status === 403) throw new AiError("Kunci API Gemini tidak berwenang. Periksa GEMINI_API_KEY.", 403);
    if (res.status === 429) throw new AiError(quotaMessage(json.error), 429);
    if (res.status >= 500) throw new AiError("Layanan AI sedang sibuk. Coba lagi.", res.status);
    // Rincian teknis hanya di log server, tidak ditampilkan ke pengguna.
    console.error("[ai] permintaan ditolak", res.status, detail.slice(0, 500));
    throw new AiError(`Permintaan AI ditolak (kode ${res.status}). Coba lagi atau hubungi admin.`, res.status);
  }

  const cand = json.candidates?.[0];
  if (!cand?.content?.parts) {
    const why = json.promptFeedback?.blockReason || cand?.finishReason;
    throw new AiError(`Model tidak memberikan jawaban${why ? ` (${why})` : ""}. Coba lagi atau ganti dokumen.`);
  }

  const content: ResponseBlock[] = [];
  let calls = 0;
  for (const p of cand.content.parts) {
    if (p.thought) continue; // ringkasan pemikiran model: bukan jawaban
    if ("text" in p && p.text) content.push({ type: "text", text: p.text });
    else if ("functionCall" in p) {
      calls += 1;
      content.push({
        type: "tool_use",
        id: `gcall_${Date.now().toString(36)}_${calls}`,
        name: p.functionCall.name,
        input: (p.functionCall.args && typeof p.functionCall.args === "object" ? p.functionCall.args : {}) as Record<string, unknown>,
        ...(p.thoughtSignature ? { signature: p.thoughtSignature } : {})
      });
    }
  }

  const stop_reason = calls > 0 ? "tool_use" : cand.finishReason === "MAX_TOKENS" ? "max_tokens" : "end_turn";
  return {
    id: `gemini_${Date.now().toString(36)}`,
    model,
    stop_reason,
    content,
    usage: {
      input_tokens: json.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: json.usageMetadata?.candidatesTokenCount ?? 0
    }
  };
}
