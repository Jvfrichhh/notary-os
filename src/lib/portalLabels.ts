import type { JobStatus } from "@prisma/client";

/**
 * Label status pekerjaan versi KLIEN. Istilah internal (INBOX, REVIEW, dst)
 * diterjemahkan jadi kalimat yang menjelaskan apa yang sedang terjadi dan
 * apakah klien perlu bertindak -- tanpa membuka detail proses internal kantor.
 */
export const PORTAL_JOB_STATUS: Record<JobStatus, { label: string; hint: string; needsClient: boolean }> = {
  INBOX: { label: "Diterima", hint: "Permohonan Anda sudah kami terima dan akan segera diproses.", needsClient: false },
  IN_PROGRESS: { label: "Sedang Diproses", hint: "Tim kami sedang mengerjakan pekerjaan ini.", needsClient: false },
  WAITING_FOR_CLIENT: {
    label: "Menunggu Tanggapan Anda",
    hint: "Kami membutuhkan konfirmasi atau informasi dari Anda. Silakan hubungi kantor.",
    needsClient: true
  },
  WAITING_FOR_DOCUMENT: {
    label: "Menunggu Dokumen dari Anda",
    hint: "Masih ada dokumen yang perlu Anda lengkapi. Lihat daftar dokumen di bawah.",
    needsClient: true
  },
  REVIEW: { label: "Pemeriksaan Akhir", hint: "Draft sedang diperiksa sebelum penandatanganan.", needsClient: false },
  READY_FOR_SIGNING: {
    label: "Siap Ditandatangani",
    hint: "Akta siap ditandatangani. Kantor akan menghubungi Anda untuk jadwal.",
    needsClient: true
  },
  COMPLETED: { label: "Selesai", hint: "Pekerjaan ini telah selesai.", needsClient: false },
  CANCELLED: { label: "Dibatalkan", hint: "Pekerjaan ini dibatalkan.", needsClient: false }
};

export const PORTAL_ACTIVE_STATUSES: JobStatus[] = [
  "INBOX",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "WAITING_FOR_DOCUMENT",
  "REVIEW",
  "READY_FOR_SIGNING"
];

export const PORTAL_NEEDS_CLIENT_STATUSES: JobStatus[] = (Object.keys(PORTAL_JOB_STATUS) as JobStatus[]).filter(
  (s) => PORTAL_JOB_STATUS[s].needsClient
);

export function portalStatusLabel(status: JobStatus): string {
  return PORTAL_JOB_STATUS[status]?.label ?? status;
}
