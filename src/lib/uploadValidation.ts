/**
 * Validasi upload server-side untuk Document Vault (Blueprint §12).
 * HARUS selalu dipanggil di server action, bukan cuma diandalkan dari
 * `accept` attribute di <input type="file"> (itu cuma UI hint, gampang dilewati).
 */

// Ekstensi -> daftar Content-Type yang wajar untuknya. File.type dari browser
// kadang kosong/"application/octet-stream" (terutama drag-drop atau OS tertentu)
// jadi itu tetap diterima selama ekstensinya cocok whitelist; tapi kalau
// Content-Type diisi browser dan JELAS tidak cocok (mis. .pdf dikirim sebagai
// image/gif), upload ditolak -- mengurangi risiko ekstensi dipalsukan.
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"]
};

const GENERIC_CONTENT_TYPES = new Set(["", "application/octet-stream"]);

export const ALLOWED_EXTENSIONS_LABEL = "PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG";

// Portal klien: format Office lama (.doc/.xls) bisa membawa makro berbahaya
// yang lalu dibuka staf di kantor -> tidak diterima dari klien.
const PORTAL_BLOCKED = new Set(["doc", "xls"]);
export const PORTAL_EXTENSIONS_LABEL = "PDF, DOCX, XLSX, JPG, JPEG, PNG";

// input attribute `accept` -- turunan langsung dari whitelist di atas, dipakai
// UI supaya konsisten dengan yang benar-benar dicek server.
export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(",");

export const PORTAL_ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_EXTENSIONS)
  .filter((ext) => !PORTAL_BLOCKED.has(ext))
  .map((ext) => `.${ext}`)
  .join(",");

// Tanda tangan byte awal tiap format: isi file harus benar-benar sesuai
// ekstensinya (mis. file .exe yang diganti nama jadi .pdf ditolak).
const MAGIC: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  docx: [[0x50, 0x4b, 0x03, 0x04]], // ZIP
  xlsx: [[0x50, 0x4b, 0x03, 0x04]],
  doc: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]], // OLE2
  xls: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]
};

/** Content-Type aman untuk menyajikan file (dari ekstensi, bukan dari data tersimpan). */
export function safeContentType(fileName: string): string {
  return ALLOWED_EXTENSIONS[getExtension(fileName)]?.[0] ?? "application/octet-stream";
}

/** Jumlah byte awal yang perlu dibaca untuk memeriksa isi file. */
export const MAGIC_BYTES_NEEDED = 1024;

/** Periksa byte awal file cocok dengan ekstensinya. */
export function validateFileSignature(fileName: string, head: Buffer): { ok: true } | { ok: false; message: string } {
  const ext = getExtension(fileName);
  const sigs = MAGIC[ext];
  if (!sigs) return { ok: false, message: "Tipe file tidak diizinkan." };
  // PDF boleh diawali sedikit data sampah sebelum "%PDF" (spesifikasi: dalam 1024 byte pertama).
  const match =
    ext === "pdf"
      ? head.subarray(0, 1024).includes("%PDF")
      : sigs.some((sig) => head.length >= sig.length && sig.every((b, i) => head[i] === b));
  return match ? { ok: true } : { ok: false, message: `Isi file bukan ${ext.toUpperCase()} yang valid. Upload ditolak.` };
}

function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function getMaxUploadSizeBytes(): number {
  const mb = parseInt(process.env.MAX_UPLOAD_SIZE_MB || "20", 10);
  const safeMb = Number.isFinite(mb) && mb > 0 ? mb : 20;
  return safeMb * 1024 * 1024;
}

export function validateUploadFile(file: File, opts: { portal?: boolean } = {}): { ok: true } | { ok: false; message: string } {
  return validateUploadMeta({ name: file.name, type: file.type, size: file.size }, opts);
}

/**
 * Validasi yang sama berdasarkan metadata saja -- dipakai untuk unggah
 * langsung (file tidak lewat server; ukuran asli dicek lagi ke storage).
 */
export function validateUploadMeta(
  file: { name: string; type: string; size: number },
  opts: { portal?: boolean } = {}
): { ok: true } | { ok: false; message: string } {
  if (!file.size || file.size <= 0) return { ok: false, message: "File kosong." };
  const ext = getExtension(file.name);
  const allowedMimes = ALLOWED_EXTENSIONS[ext];

  if (!allowedMimes || (opts.portal && PORTAL_BLOCKED.has(ext))) {
    const label = opts.portal ? PORTAL_EXTENSIONS_LABEL : ALLOWED_EXTENSIONS_LABEL;
    return { ok: false, message: `Tipe file tidak diizinkan. Format yang didukung: ${label}.` };
  }

  if (file.type && !GENERIC_CONTENT_TYPES.has(file.type) && !allowedMimes.includes(file.type)) {
    return { ok: false, message: `Isi file tidak cocok dengan ekstensi ${ext.toUpperCase()}. Upload ditolak.` };
  }

  const maxBytes = getMaxUploadSizeBytes();
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, message: `Ukuran file melebihi batas maksimum ${maxMb} MB.` };
  }

  return { ok: true };
}
