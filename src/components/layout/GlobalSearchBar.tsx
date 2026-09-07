"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { SearchResultGroup } from "@/app/api/search/route";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/**
 * Global search lintas Client/Job/Akta/Minuta/Salinan/Grosse/Kutipan/
 * Repertorium (Blueprint §46). Query dieksekusi server-side lewat
 * /api/search (permission tetap dicek di server, bukan cuma disembunyikan
 * di UI) -- komponen ini hanya debounce input & render hasil yang sudah
 * dikelompokkan per entity.
 */
export function GlobalSearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setGroups([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setHasError(false);

      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error("search_failed");
          return res.json() as Promise<{ groups: SearchResultGroup[] }>;
        })
        .then((data) => {
          setGroups(data.groups ?? []);
          setIsLoading(false);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setHasError(true);
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function goTo(href: string) {
    setIsOpen(false);
    setQuery("");
    setGroups([]);
    router.push(href);
  }

  const trimmedQuery = query.trim();
  const showDropdown = isOpen && trimmedQuery.length >= MIN_QUERY_LENGTH;
  const totalResults = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Cari client, job, nomor akta..."
        className="w-full rounded-md border border-border bg-background py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
          {isLoading && totalResults === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Mencari...</p>
          )}
          {!isLoading && hasError && (
            <p className="p-3 text-sm text-muted-foreground">Gagal memuat hasil pencarian. Coba lagi.</p>
          )}
          {!isLoading && !hasError && totalResults === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Tidak ada hasil untuk &quot;{trimmedQuery}&quot;.</p>
          )}
          {!hasError &&
            groups.map((group) => (
              <div key={group.entity} className="border-b border-border py-1.5 last:border-b-0">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(item.href)}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium text-foreground">{item.title}</span>
                    {item.subtitle && <span className="text-xs text-muted-foreground">{item.subtitle}</span>}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
