import { createHash } from "crypto";

/** JSON dengan urutan key tetap (jsonb Postgres mengurutkan ulang key). */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object)
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/** Sidik isi draft: berubah bila isian draft diubah setelah dibagikan ke klien. */
export function draftHash(data: unknown): string {
  return createHash("sha256").update(stable(data)).digest("hex").slice(0, 32);
}

export type ReviewState = "none" | "waiting" | "approved" | "changes" | "outdated";

/** Status pemeriksaan klien dari review terakhir + isi draft sekarang. */
export function reviewState(latest: { dataHash: string; decision: string | null } | null | undefined, currentHash: string): ReviewState {
  if (!latest) return "none";
  if (latest.dataHash !== currentHash && latest.decision !== "CHANGES") return "outdated";
  if (latest.decision === "APPROVED") return "approved";
  if (latest.decision === "CHANGES") return "changes";
  return "waiting";
}
