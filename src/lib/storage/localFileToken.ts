import { createHmac, timingSafeEqual } from "crypto";

/**
 * Local dev hanya menyajikan file lewat token HMAC bertanda tangan + expiry --
 * BUKAN lewat storageKey mentah -- supaya URL file tidak bisa ditebak/diubah
 * seperti presigned URL R2 di production. Lihat storage/LocalStorageProvider.ts
 * dan api/files/local/[token]/route.ts.
 */
interface LocalFileTokenPayload {
  storageKey: string;
  exp: number; // epoch seconds
}

function getSecret(): string {
  // Reuse NEXTAUTH_SECRET supaya tidak perlu env var baru. Fallback dev-only
  // kalau env belum di-set sama sekali (misal saat build lokal tanpa .env).
  return process.env.NEXTAUTH_SECRET || "dev-only-insecure-secret-change-me";
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function signLocalFileToken(storageKey: string, expiresInSeconds = 300): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = base64url(JSON.stringify({ storageKey, exp } satisfies LocalFileTokenPayload));
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyLocalFileToken(token: string): LocalFileTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expectedSig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64url(body)) as LocalFileTokenPayload;
    if (typeof payload.storageKey !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
