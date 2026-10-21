export type DeadlineTone = "overdue" | "due-today" | "due-soon" | "on-track" | "archived";

// Kantor notaris ini beroperasi di WIB. Field tanggal-saja (deadline, deedDate,
// dst) disimpan sebagai UTC-midnight dari input <input type="date">, jadi
// dibaca balik dengan getter UTC (bukan getter lokal yang bergantung timezone
// server). "Hari ini" dihitung terhadap Asia/Jakarta, bukan timezone server
// (Vercel default-nya UTC) -- supaya job yang deadline-nya hari ini tidak
// salah kebaca "besok"/"kemarin" tiap pagi WIB.
const JAKARTA_TZ = "Asia/Jakarta";

/** "Hari ini" versi kantor (Asia/Jakarta), dikembalikan sebagai Date UTC-midnight
 *  supaya bisa dibandingkan langsung dengan kolom tanggal yang UTC-midnight juga. */
export function getJakartaToday(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function getJakartaYear(): number {
  return getJakartaToday().getUTCFullYear();
}

/** Strip time dari kolom tanggal-saja pakai getter UTC (bukan lokal). */
function utcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Blueprint §7 Deadline & Reminder — visual warning:
 * 🔴 overdue · 🟠 due today · 🟡 due soon (≤3 hari) · 🟢 on track
 */
export function classifyDeadline(deadline: Date | null, status: string): DeadlineTone {
  if (status === "COMPLETED" || status === "CANCELLED") return "archived";
  if (!deadline) return "on-track";

  const startOfToday = getJakartaToday();
  const deadlineDay = utcDateOnly(deadline);
  const diffDays = Math.round((deadlineDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "due-today";
  if (diffDays <= 3) return "due-soon";
  return "on-track";
}

/** Label Indonesia untuk nilai enum yang tampil di layar. */
const ENUM_LABEL: Record<string, string> = {
  // Status pekerjaan
  INBOX: "Masuk",
  IN_PROGRESS: "Sedang Diproses",
  WAITING_FOR_CLIENT: "Menunggu Klien",
  WAITING_FOR_DOCUMENT: "Menunggu Dokumen",
  REVIEW: "Diperiksa Notaris",
  READY_FOR_SIGNING: "Siap Ditandatangani",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  // Prioritas
  LOW: "Rendah",
  NORMAL: "Normal",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
  // Tugas / checklist
  TODO: "Belum",
  DONE: "Selesai",
  MISSING: "Belum Ada",
  COMPLETE: "Lengkap",
  PENDING_REVIEW: "Menunggu Pemeriksaan",
  ACCEPTED: "Diterima",
  NEEDS_REVISION: "Perlu Perbaikan",
  // Dokumen
  CLIENT_DOCUMENT: "Dokumen Klien",
  WORKING_DOCUMENT: "Dokumen Kerja",
  FINAL_DOCUMENT: "Dokumen Final",
  SUPPORTING_DOCUMENT: "Dokumen Pendukung",
  // Pembayaran
  UNPAID: "Belum Dibayar",
  PARTIALLY_PAID: "Dibayar Sebagian",
  PAID: "Lunas",
  REFUNDED: "Dikembalikan",
  // Arsip / layanan
  ACTIVE: "Aktif",
  ARCHIVED: "Diarsipkan",
  TRASHED: "Dihapus",
  DRAFT: "Draft",
  PROCESS: "Proses",
  DIBUAT: "Dibuat",
  DICATAT: "Dicatat",
  DILAPORKAN: "Dilaporkan",
  BUKTI_TERSEDIA: "Bukti Tersedia"
};

export function formatStatusLabel(status: string): string {
  if (ENUM_LABEL[status]) return ENUM_LABEL[status];
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// timeZone: "UTC" -- field tanggal-saja (deadline, deedDate, dll) disimpan
// UTC-midnight; format di UTC supaya tanggal yang tampil selalu persis yang
// dipilih user, apa pun timezone server.
export function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(date)
  );
}

// timeZone Asia/Jakarta -- ini timestamp beneran (visit check-in, notifikasi,
// dll), jadi ditampilkan di waktu kantor, bukan waktu server.
/** Tanggal dari timestamp sungguhan (mis. startDate, uploadedAt) menurut waktu kantor. */
export function formatDateJakarta(date: Date | string | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: JAKARTA_TZ }).format(
    new Date(date)
  );
}

/** Nilai <input type="date"> dari kolom tanggal-saja (UTC-midnight). */
export function toDateInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** Kolom tanggal-saja dari <input type="date"> (disimpan UTC-midnight, sesuai konvensi di atas). */
export function fromDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: JAKARTA_TZ
  }).format(new Date(date));
}

// Terima juga Prisma.Decimal (punya .toString() tapi bukan number|string secara tipe).
export function formatCurrency(amount: number | string | { toString(): string }): string {
  return `Rp ${Number(amount.toString()).toLocaleString("id-ID")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}
