"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Sparkles, Trash2 } from "lucide-react";
import { askAssistantAction } from "@/app/(dashboard)/assistant/actions";
import type { ChatTurn } from "@/lib/ai/assistant";

type Bubble = ChatTurn & { error?: boolean; toolsUsed?: string[] };

const STORAGE_KEY = "notary-os.assistant.history";

/**
 * Antarmuka percakapan Asisten AI. Riwayat disimpan di sessionStorage
 * (hilang saat tab ditutup) supaya pindah halaman tidak menghapus obrolan,
 * tetapi tidak menumpuk data klien di browser.
 */
export function AssistantChat({ suggestions, userName, model }: { suggestions: string[]; userName: string; model: string }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const lastQuestion = useRef("");

  // Penghitung detik saat menunggu, supaya staf tahu prosesnya masih jalan.
  useEffect(() => {
    if (!pending) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [pending]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setBubbles(JSON.parse(raw));
    } catch {
      /* abaikan */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bubbles.slice(-30)));
    } catch {
      /* abaikan */
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles]);

  function send(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    const history: ChatTurn[] = bubbles.filter((b) => !b.error).map(({ role, content }) => ({ role, content }));
    lastQuestion.current = q;
    setBubbles((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    startTransition(async () => {
      // Gangguan jaringan / server timeout melempar error dari server action:
      // tampilkan sebagai gelembung error, jangan sampai halaman jatuh ke error boundary.
      const res = await askAssistantAction(history, q).catch(() => ({
        answer: undefined,
        toolsUsed: undefined,
        error: "Koneksi ke Asisten terputus atau terlalu lama. Coba kirim ulang pertanyaannya."
      }));
      setBubbles((prev) => [
        ...prev,
        res.answer
          ? { role: "assistant", content: res.answer, toolsUsed: res.toolsUsed }
          : { role: "assistant", content: res.error ?? "Terjadi kesalahan.", error: true }
      ]);
      inputRef.current?.focus();
    });
  }

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col rounded-lg border border-border bg-background shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {bubbles.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Halo {userName}. Coba salah satu pertanyaan ini, atau ketik sendiri:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {bubbles.map((b, i) => (
          <div key={i} className={b.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                b.role === "user"
                  ? "max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : b.error
                    ? "max-w-[85%] rounded-lg border border-status-overdue/40 bg-status-overdue/5 px-3 py-2 text-sm text-foreground"
                    : "max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
              }
            >
              {b.role === "assistant" && !b.error && (
                <div className="mb-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Asisten
                </div>
              )}
              <div className="whitespace-pre-wrap">{b.content}</div>
              {b.error && i === bubbles.length - 1 && lastQuestion.current && (
                <button
                  type="button"
                  onClick={() => {
                    // Ulangi pertanyaan terakhir tanpa mengetik ulang (gelembung error dibuang).
                    const q = lastQuestion.current;
                    setBubbles((prev) => prev.slice(0, -2));
                    setTimeout(() => send(q), 0);
                  }}
                  className="mt-2 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Coba lagi
                </button>
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {elapsed < 4 ? "Mencari data..." : elapsed < 15 ? "Menyusun jawaban..." : "Masih diproses, layanan AI sedang lambat..."}
              <span className="ml-2 tabular-nums text-xs">{elapsed}s</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder="Tulis pertanyaan... (Enter untuk kirim, Shift+Enter baris baru)"
          className="max-h-32 flex-1 resize-y rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> Kirim
        </button>
        {bubbles.length > 0 && (
          <button
            type="button"
            onClick={() => setBubbles([])}
            title="Hapus percakapan"
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </form>
      <p className="px-3 pb-2 text-[11px] text-muted-foreground">
        Jawaban dibuat AI ({model}) dari data aplikasi dan bisa keliru; periksa di halaman terkait sebelum mengambil keputusan.
      </p>
    </div>
  );
}
