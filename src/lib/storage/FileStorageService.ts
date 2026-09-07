/**
 * Kontrak storage. Business logic (services/API routes) HANYA boleh
 * bergantung pada interface ini — tidak pernah mengimpor
 * LocalStorageProvider / R2StorageProvider secara langsung.
 * Ganti provider = ganti implementasi di storage/index.ts, tanpa
 * menyentuh kode di luar folder ini. (Blueprint §11 File Storage Architecture)
 */
export interface UploadResult {
  storageKey: string;
  size: number;
}

export interface FileStorageService {
  /** Simpan file, kembalikan storageKey yang harus disimpan di kolom `documents.storageKey`. */
  upload(params: { buffer: Buffer; fileName: string; contentType: string; folder?: string }): Promise<UploadResult>;

  /** Ambil URL sementara (signed) untuk membuka/mengunduh file — tidak pernah expose path publik langsung. */
  getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;

  /** Hapus file fisik. Dipanggil hanya dari alur hard-delete admin, bukan soft delete biasa. */
  delete(storageKey: string): Promise<void>;
}
