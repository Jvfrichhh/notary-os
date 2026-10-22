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
  getSignedUrl(storageKey: string, expiresInSeconds?: number, opts?: { contentType?: string }): Promise<string>;

  /** Hapus file fisik. Dipanggil hanya dari alur hard-delete admin, bukan soft delete biasa. */
  delete(storageKey: string): Promise<void>;

  /**
   * Baca isi file ke memori (dipakai analisis dokumen AI di server).
   * Pemanggil wajib sudah memeriksa izin; fungsi ini tidak tahu konteks user.
   */
  getObjectBuffer(storageKey: string): Promise<Buffer>;

  /**
   * Unggah langsung dari browser (tanpa melewati server, yang di Vercel
   * dibatasi ±4,5 MB per request). Provider yang tidak mendukung (local)
   * mengembalikan false dan aplikasi memakai jalur form biasa.
   */
  supportsDirectUpload(): boolean;
  /** URL PUT bertanda tangan berumur pendek untuk satu storageKey + Content-Type. */
  getSignedPutUrl(storageKey: string, contentType: string, expiresInSeconds?: number): Promise<string>;
  /** Metadata objek (untuk memverifikasi unggahan langsung); null bila tidak ada. */
  headObject(storageKey: string): Promise<{ size: number; contentType: string | null } | null>;
  /** Baca beberapa byte pertama file (untuk memeriksa isi sesuai ekstensi). */
  readHead(storageKey: string, bytes: number): Promise<Buffer>;
  /** Salin objek di storage (dipakai memindahkan unggahan ke lokasi final). */
  copyObject(fromKey: string, toKey: string): Promise<void>;
  /** Daftar objek di bawah satu awalan (untuk membersihkan unggahan yang tidak jadi). */
  listObjects(prefix: string): Promise<{ key: string; lastModified: Date | null }[]>;
}

/** Bentuk storageKey yang dipakai semua provider: "<folder>/<uuid>-<nama-aman>". */
export function buildStorageKey(folder: string, fileName: string, uuid: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-120);
  return `${folder}/${uuid}-${safeName}`;
}
