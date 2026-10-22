import { createMessage, textOf, type ContentBlockParam, type MessageParam, type ResponseBlock } from "@/lib/ai/client";
import { runTool, toolsFor, type AssistantContext } from "@/lib/ai/assistantTools";

/**
 * Asisten Kantor: tanya-jawab Bahasa Indonesia atas data kantor.
 *
 * Model hanya bisa "melihat" data lewat tools (assistantTools.ts) yang sudah
 * dibatasi hak akses user. Loop: model minta tool -> kita jalankan -> hasil
 * dikembalikan -> model menjawab. Maksimal MAX_STEPS putaran supaya biaya dan
 * waktu terkendali.
 */

const MAX_STEPS = 6;
const MAX_HISTORY = 12; // pesan terakhir yang dikirim ulang (hemat token)

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantAnswer {
  answer: string;
  toolsUsed: string[];
  inputTokens: number;
  outputTokens: number;
}

function systemPrompt(ctx: AssistantContext): string {
  const now = new Date();
  const wib = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(now);
  const isoToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now); // YYYY-MM-DD

  return `Anda adalah Asisten Kantor di aplikasi Nexora, sistem manajemen sebuah kantor notaris di Indonesia.
Anda berbicara dengan ${ctx.userName}, staf kantor yang sudah login.
Sekarang: ${wib} WIB (tanggal ISO: ${isoToday}).

Cara kerja:
- Jawab HANYA berdasarkan hasil tool. Jika perlu data, panggil tool; jangan menebak atau mengarang nomor, nama, tanggal, atau jumlah.
- Jika tool mengembalikan kosong, katakan tidak ada datanya. Jika Anda tidak punya tool untuk menjawab (mis. data yang user tidak berhak lihat), katakan dengan sopan bahwa data itu tidak tersedia untuk Anda.
- Anda tidak bisa mengubah data apa pun. Jika user minta mengubah status, menghapus, atau mengirim sesuatu, jelaskan langkahnya di aplikasi (menu mana) tanpa melakukannya.
- Pertanyaan relatif waktu ("minggu ini", "besok", "bulan lalu") hitung dari tanggal di atas, zona waktu WIB.
- Format jawaban: Bahasa Indonesia yang ringkas dan rapi. Gunakan daftar bernomor/berpoin untuk beberapa item; selalu sebut nomor pekerjaan (JOB-...) dan nama klien agar mudah dicari. Tanggal ditulis seperti "20 Okt 2026". Nominal rupiah dengan pemisah ribuan.
- Jangan menyebut nama tool atau istilah teknis ke user; cukup jawabannya.
- Jika pertanyaan di luar urusan kantor notaris atau aplikasi ini, jawab singkat bahwa Anda hanya membantu soal data kantor.`;
}

export async function askAssistant(history: ChatTurn[], question: string, ctx: AssistantContext): Promise<AssistantAnswer> {
  const tools = toolsFor(ctx);
  const recent = history.slice(-MAX_HISTORY);
  const messages: MessageParam[] = [
    ...recent.map((t) => ({ role: t.role, content: t.content }) as MessageParam),
    { role: "user", content: question }
  ];

  const toolsUsed: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await createMessage({
      system: systemPrompt(ctx),
      messages,
      tools,
      maxTokens: 1200,
      temperature: 0.2,
      timeoutMs: 60_000
    });
    inputTokens += res.usage?.input_tokens ?? 0;
    outputTokens += res.usage?.output_tokens ?? 0;

    const toolUses = res.content.filter((b): b is Extract<ResponseBlock, { type: "tool_use" }> => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || toolUses.length === 0) {
      const answer = textOf(res) || "Maaf, saya tidak dapat menyusun jawaban. Coba ulangi pertanyaannya.";
      return { answer, toolsUsed, inputTokens, outputTokens };
    }

    // Jalankan semua permintaan tool pada giliran ini, lalu kembalikan hasilnya.
    messages.push({ role: "assistant", content: res.content as ContentBlockParam[] });
    const results: ContentBlockParam[] = [];
    for (const call of toolUses) {
      toolsUsed.push(call.name);
      const out = await runTool(call.name, call.input ?? {}, ctx);
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: JSON.stringify(out.result).slice(0, 20_000),
        is_error: !out.ok
      });
    }
    messages.push({ role: "user", content: results });
  }

  return {
    answer: "Pertanyaan ini membutuhkan terlalu banyak langkah. Coba persempit, misalnya sebut nomor pekerjaan atau nama klien.",
    toolsUsed,
    inputTokens,
    outputTokens
  };
}
