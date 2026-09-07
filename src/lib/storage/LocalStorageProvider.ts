import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { FileStorageService, UploadResult } from "./FileStorageService";
import { signLocalFileToken } from "./localFileToken";

// Dipakai juga oleh api/files/local/[token]/route.ts supaya path dasar konsisten.
export const LOCAL_STORAGE_BASE_PATH = process.env.LOCAL_STORAGE_PATH || "./storage";

/**
 * Implementasi development-only. JANGAN dipakai di production —
 * lihat storage/index.ts, provider dipilih otomatis dari STORAGE_PROVIDER.
 */
export class LocalStorageProvider implements FileStorageService {
  private basePath: string;

  constructor(basePath = LOCAL_STORAGE_BASE_PATH) {
    this.basePath = basePath;
  }

  async upload(params: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
    folder?: string;
  }): Promise<UploadResult> {
    const folder = params.folder ?? "misc";
    const dir = path.join(this.basePath, folder);
    await fs.mkdir(dir, { recursive: true });

    const safeName = `${randomUUID()}-${params.fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const fullPath = path.join(dir, safeName);
    await fs.writeFile(fullPath, params.buffer);

    return {
      storageKey: path.join(folder, safeName).replace(/\\/g, "/"),
      size: params.buffer.length
    };
  }

  async getSignedUrl(storageKey: string, expiresInSeconds = 300): Promise<string> {
    // Token HMAC bertanda tangan + expiry -- BUKAN storageKey mentah -- supaya
    // tidak bisa diakses hanya dengan menebak/mengubah URL. Dicek di
    // /api/files/local/[token]/route.ts.
    const token = signLocalFileToken(storageKey, expiresInSeconds);
    return `/api/files/local/${token}`;
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = path.join(this.basePath, storageKey);
    await fs.unlink(fullPath).catch(() => undefined);
  }
}
