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

// input attribute `accept` -- turunan langsung dari whitelist di atas, dipakai
// UI supaya konsisten dengan yang benar-benar dicek server.
export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(",");

function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function getMaxUploadSizeBytes(): number {
  const mb = parseInt(process.env.MAX_UPLOAD_SIZE_MB || "20", 10);
  const safeMb = Number.isFinite(mb) && mb > 0 ? mb : 20;
  return safeMb * 1024 * 1024;
}

export function validateUploadFile(file: File): { ok: true } | { ok: false; message: string } {
  const ext = getExtension(file.name);
  const allowedMimes = ALLOWED_EXTENSIONS[ext];

  if (!allowedMimes) {
    return { ok: false, message: `Tipe file tidak diizinkan. Format yang didukung: ${ALLOWED_EXTENSIONS_LABEL}.` };
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
