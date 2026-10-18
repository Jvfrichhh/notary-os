import type { FileStorageService } from "./FileStorageService";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { S3StorageProvider, s3ConfigFromEnv } from "./S3StorageProvider";

/**
 * Satu-satunya tempat yang tahu provider konkret mana yang dipakai.
 * Kode lain (API routes, services) import `getFileStorage()` saja.
 *
 * STORAGE_PROVIDER=local     -> development saja (disk lokal; GAGAL di Vercel
 *                               karena filesystem read-only)
 * STORAGE_PROVIDER=supabase  -> Supabase Storage via protokol S3 (disarankan,
 *                               satu akun dengan database)
 * STORAGE_PROVIDER=r2        -> Cloudflare R2
 * STORAGE_PROVIDER=s3        -> layanan S3-kompatibel lain
 */
let instance: FileStorageService | null = null;

export function getFileStorage(): FileStorageService {
  if (instance) return instance;

  const provider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
  if (provider === "local") {
    if (process.env.VERCEL) {
      // Gagal lebih awal dengan pesan jelas, bukan EROFS misterius saat upload.
      throw new Error(
        "STORAGE_PROVIDER=local tidak bisa dipakai di Vercel (disk read-only). Set STORAGE_PROVIDER=supabase (atau r2/s3) beserta kredensialnya."
      );
    }
    instance = new LocalStorageProvider();
  } else {
    instance = new S3StorageProvider(s3ConfigFromEnv(provider));
  }
  return instance;
}

export type { FileStorageService, UploadResult } from "./FileStorageService";
