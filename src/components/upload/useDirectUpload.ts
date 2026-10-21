"use client";

import { useState, useTransition } from "react";
import type { TicketResult } from "@/lib/upload/directUpload";

/** Di atas ini file tidak bisa lewat server Vercel (batas ±4,5 MB per request). */
const FORM_FALLBACK_MAX = 4 * 1024 * 1024;

export type FileMeta = { fileName: string; fileType: string; fileSize: number };

/**
 * Bungkus submit form berisi <input type="file" name="file">:
 *  1. minta tiket unggah langsung ke server (izin dicek di sana),
 *  2. PUT file langsung ke storage,
 *  3. kirim form TANPA file, hanya tiketnya, ke server action biasa.
 * Bila storage tidak mendukung unggah langsung, atau unggah langsung gagal
 * dan file cukup kecil, file dikirim lewat form seperti dulu.
 */
export function useDirectUpload(
  requestTicket: (form: HTMLFormElement, meta: FileMeta) => Promise<TicketResult>,
  formAction: (formData: FormData) => void
) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    setUploadError(null);

    if (!(file instanceof File) || file.size === 0) {
      startTransition(() => formAction(fd));
      return;
    }

    setUploading(true);
    try {
      const meta = { fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: file.size };
      const ticket = await requestTicket(form, meta);
      if (ticket.mode === "error") {
        setUploadError(ticket.error);
        return;
      }
      if (ticket.mode === "direct") {
        let ok = false;
        try {
          const res = await fetch(ticket.url, { method: "PUT", headers: { "content-type": ticket.contentType }, body: file });
          ok = res.ok;
        } catch {
          ok = false;
        }
        if (ok) {
          fd.delete("file");
          fd.set("directUploadTicket", ticket.ticket);
        } else if (file.size > FORM_FALLBACK_MAX) {
          setUploadError("Gagal mengunggah file ke penyimpanan. Periksa koneksi internet lalu coba lagi.");
          return;
        }
        // else: cadangan -- file kecil tetap ikut di form.
      }
      startTransition(() => formAction(fd));
    } catch {
      setUploadError("Terjadi kesalahan saat menyiapkan unggahan. Coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  return { onSubmit, busy: uploading || isPending, uploading, uploadError };
}
