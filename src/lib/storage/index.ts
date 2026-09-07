import type { FileStorageService } from "./FileStorageService";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { R2StorageProvider } from "./R2StorageProvider";

/**
 * Satu-satunya tempat yang tahu provider konkret mana yang dipakai.
 * Kode lain (API routes, services) import `getFileStorage()` saja.
 *
 * STORAGE_PROVIDER=local  -> development
 * STORAGE_PROVIDER=r2     -> production (Cloudflare R2)
 */
let instance: FileStorageService | null = null;

export function getFileStorage(): FileStorageService {
  if (instance) return instance;

  const provider = process.env.STORAGE_PROVIDER || "local";

  instance = provider === "r2" ? new R2StorageProvider() : new LocalStorageProvider();

  return instance;
}

export type { FileStorageService, UploadResult } from "./FileStorageService";
