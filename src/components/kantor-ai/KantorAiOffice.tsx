"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { KantorAiSnapshot } from "@/lib/kantorAi";
import { usePhrase } from "@/components/i18n/LocaleProvider";

type KantorAiInstance = {
  update: (data: KantorAiSnapshot) => void;
  destroy: () => void;
};

type KantorAiEngine = {
  mount: (
    root: HTMLElement,
    data: KantorAiSnapshot,
    opts?: { live?: boolean; jobHref?: (id: string) => string }
  ) => KantorAiInstance;
};

declare global {
  interface Window {
    KantorAI?: KantorAiEngine;
  }
}

// Engine kanvas (tanpa data) disajikan dari /public dan tetap dijaga login oleh proxy.
const ENGINE_SRC = "/kantor-ai/engine.js?v=1";
const REFRESH_MS = 60_000;

export function KantorAiOffice({ initial }: { initial: KantorAiSnapshot }) {
  const tp = usePhrase();
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saat kembali ke halaman ini, skrip sudah termuat sebelumnya.
  useEffect(() => {
    if (window.KantorAI) setReady(true);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const engine = window.KantorAI;
    if (!ready || !root || !engine) return;

    const inst = engine.mount(root, initial, { live: true, jobHref: (id) => `/jobs/${id}` });
    let stopped = false;

    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/kantor-ai", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as KantorAiSnapshot;
        if (!stopped) {
          inst.update(data);
          setError(null);
        }
      } catch {
        if (!stopped) setError("Gagal memperbarui data, dicoba lagi otomatis.");
      }
    };

    const timer = window.setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      inst.destroy();
    };
  }, [ready, initial]);

  return (
    <div className="relative h-[calc(100dvh-12rem)] min-h-[560px] overflow-hidden rounded-xl border border-border bg-background shadow-card">
      <Script
        src={ENGINE_SRC}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setError("Engine Kantor AI gagal dimuat. Muat ulang halaman.")}
      />
      <div ref={rootRef} className="h-full w-full" />
      {!ready && !error && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{tp("Menyiapkan kantor...")}</div>
      )}
      {error && (
        <div className="absolute bottom-3 left-3 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-xs text-danger-strong">
          {tp(error)}
        </div>
      )}
    </div>
  );
}
