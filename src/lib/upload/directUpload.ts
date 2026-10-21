import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { getFileStorage } from "@/lib/storage";
import { buildStorageKey } from "@/lib/storage/FileStorageService";
import { validateUploadFile, validateUploadMeta } from "@/lib/uploadValidation";

/**
 * Unggah dokumen dalam dua jalur dengan hasil yang sama:
 *
 *  1. LANGSUNG (disarankan, file s.d. batas MAX_UPLOAD_SIZE_MB): browser minta
 *     tiket -> PUT file ke URL bertanda tangan storage -> kirim form berisi
 *     tiket. Server memverifikasi tanda tangan tiket (terikat ke user, folder,
 *     nama, tipe, ukuran, kedaluwarsa) lalu HEAD objek di storage untuk
 *     memastikan file benar-benar ada dan ukurannya sesuai.
 *  2. FORM (cadangan / storage lokal): file ikut dikirim di form. Di Vercel
 *     dibatasi ±4,5 MB per request.
 *
 * Tiket TIDAK memberi hak apa pun sendirian: server action tetap memeriksa
 * izin seperti biasa, dan folder di tiket wajib sama dengan folder yang
 * dihitung ulang server untuk aksi itu (tiket job A tidak bisa dipakai di job B).
 */

const TICKET_TTL_SECONDS = 15 * 60;

export interface ResolvedUpload {
  storageKey: string;
  fileName: string;
  fileType: string;
  size: number;
}

interface TicketPayload {
  k: string; // storageKey
  n: string; // fileName
  t: string; // contentType
  s: number; // size (bytes, menurut browser)
  p: string; // principal: "staff:<userId>" | "client:<accountId>"
  f: string; // folder
  e: number; // expiry (unix detik)
}

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET belum diset.");
  return s;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(`direct-upload:${body}`).digest("base64url");
}

function encodeTicket(p: TicketPayload): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeTicket(ticket: string): TicketPayload | null {
  const [body, sig] = ticket.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TicketPayload;
    if (typeof p.k !== "string" || typeof p.e !== "number") return null;
    return p;
  } catch {
    return null;
  }
}

export type TicketResult =
  | { mode: "direct"; url: string; ticket: string; contentType: string }
  | { mode: "form" }
  | { mode: "error"; error: string };

/**
 * Terbitkan tiket unggah langsung. Pemanggil (server action) WAJIB sudah
 * memeriksa izin dan menghitung `folder` dari data yang terverifikasi.
 */
export async function issueUploadTicket(params: {
  principal: string;
  folder: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}): Promise<TicketResult> {
  const contentType = params.fileType || "application/octet-stream";
  const check = validateUploadMeta({ name: params.fileName, type: contentType, size: params.fileSize });
  if (!check.ok) return { mode: "error", error: check.message };

  const storage = getFileStorage();
  if (!storage.supportsDirectUpload()) return { mode: "form" };

  const key = buildStorageKey(params.folder, params.fileName, randomUUID());
  const url = await storage.getSignedPutUrl(key, contentType, TICKET_TTL_SECONDS);
  const ticket = encodeTicket({
    k: key,
    n: params.fileName.slice(0, 255),
    t: contentType,
    s: params.fileSize,
    p: params.principal,
    f: params.folder,
    e: Math.floor(Date.now() / 1000) + TICKET_TTL_SECONDS
  });
  return { mode: "direct", url, ticket, contentType };
}

/**
 * Ambil file dari form: tiket unggah langsung (diutamakan) atau File biasa.
 * Mengembalikan error yang aman ditampilkan ke pengguna.
 */
export async function resolveUploadFromForm(
  formData: FormData,
  expected: { principal: string; folder: string }
): Promise<{ ok: true; file: ResolvedUpload } | { ok: false; error: string }> {
  const ticketRaw = formData.get("directUploadTicket");
  if (typeof ticketRaw === "string" && ticketRaw) {
    const t = decodeTicket(ticketRaw);
    if (!t) return { ok: false, error: "Tiket unggah tidak valid. Muat ulang halaman lalu coba lagi." };
    if (t.e < Math.floor(Date.now() / 1000)) return { ok: false, error: "Tiket unggah kedaluwarsa. Pilih file lagi lalu kirim ulang." };
    if (t.p !== expected.principal || t.f !== expected.folder) {
      return { ok: false, error: "Tiket unggah tidak cocok dengan tujuan dokumen ini." };
    }
    const head = await getFileStorage().headObject(t.k);
    if (!head) return { ok: false, error: "File belum sampai di penyimpanan. Coba unggah lagi." };
    const check = validateUploadMeta({ name: t.n, type: t.t, size: head.size });
    if (!check.ok) {
      await getFileStorage().delete(t.k).catch(() => undefined);
      return { ok: false, error: check.message };
    }
    return { ok: true, file: { storageKey: t.k, fileName: t.n, fileType: t.t, size: head.size } };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file terlebih dahulu." };
  const validation = validateUploadFile(file);
  if (!validation.ok) return { ok: false, error: validation.message };
  const contentType = file.type || "application/octet-stream";
  const upload = await getFileStorage().upload({
    buffer: Buffer.from(await file.arrayBuffer()),
    fileName: file.name,
    contentType,
    folder: expected.folder
  });
  return { ok: true, file: { storageKey: upload.storageKey, fileName: file.name, fileType: contentType, size: upload.size } };
}
