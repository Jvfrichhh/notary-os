import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NOTARIS } from "@/lib/deeds/common";
import { formatThousands, terbilang } from "@/lib/deeds/words";
import { buildSimpleDocx, type DocBlock } from "@/lib/office/simpleDocx";
import { formatDate, getJakartaToday } from "@/lib/format";

/**
 * Tagihan (Payment) + kuitansi (PaymentReceipt):
 *  - satu tagihan bernomor per pekerjaan ("INV/2026/10/0001");
 *  - setiap uang masuk (DP, angsuran, pelunasan) dicatat sebagai kuitansi
 *    bernomor ("KW/2026/10/0001") yang menambah "sudah dibayar";
 *  - kuitansi salah tidak dihapus, tetapi DIBATALKAN dengan alasan.
 * Status & sisa selalu dihitung server dari angka.
 */

type Tx = Prisma.TransactionClient;

const pad = (n: number, w: number) => String(n).padStart(w, "0");

/** Nomor berikutnya untuk prefix + bulan (ulang dari 0001 tiap bulan). */
async function nextNumber(tx: Tx, kind: "INV" | "KW", date: Date): Promise<string> {
  const base = `${kind}/${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1, 2)}/`;
  const rows =
    kind === "INV"
      ? await tx.payment.findMany({ where: { invoiceNumber: { startsWith: base } }, select: { invoiceNumber: true } })
      : await tx.paymentReceipt.findMany({ where: { receiptNumber: { startsWith: base } }, select: { receiptNumber: true } });
  const max = rows.reduce((m, r) => {
    const v = "invoiceNumber" in r ? r.invoiceNumber : (r as { receiptNumber: string }).receiptNumber;
    return Math.max(m, Number(v?.slice(base.length)) || 0);
  }, 0);
  return `${base}${pad(max + 1, 4)}`;
}

const isUnique = (err: unknown, field: string) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && JSON.stringify(err.meta ?? "").includes(field);

/** Coba ulang bila nomor bentrok (dua orang menyimpan bersamaan). */
async function withRetry<T>(field: string, fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i < 4 && isUnique(err, field)) continue;
      throw err;
    }
  }
}

/**
 * Angka uang dari isian (format Indonesia): "1.500.000", "Rp 1.500.000,00",
 * "1500000" -> 1500000. Bagian desimal setelah koma diabaikan (rupiah bulat).
 */
export function parseMoney(value: unknown): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const intPart = raw.replace(/^rp\.?/i, "").split(",")[0];
  const n = Number(intPart.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function derivePaymentStatus(total: number, paid: number, refunded = false) {
  if (refunded) return "REFUNDED" as const;
  if (paid <= 0) return "UNPAID" as const;
  if (total > 0 && paid >= total) return "PAID" as const;
  return "PARTIALLY_PAID" as const;
}

/** Beri nomor tagihan pada Payment yang belum punya. */
export async function ensureInvoiceNumber(paymentId: string): Promise<string> {
  return withRetry("invoiceNumber", () =>
    prisma.$transaction(async (tx) => {
      const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, select: { invoiceNumber: true, createdAt: true } });
      if (p.invoiceNumber) return p.invoiceNumber;
      const invoiceNumber = await nextNumber(tx, "INV", getJakartaToday());
      await tx.payment.update({ where: { id: paymentId }, data: { invoiceNumber } });
      return invoiceNumber;
    })
  );
}

/** Catat uang masuk -> kuitansi bernomor; total dibayar, sisa, dan status diperbarui. */
export async function recordReceipt(input: {
  paymentId: string;
  amount: number;
  paidAt: Date;
  method: string | null;
  note: string | null;
  userId: string;
}) {
  return withRetry("receiptNumber", () =>
    prisma.$transaction(async (tx) => {
      const p = await tx.payment.findUniqueOrThrow({
        where: { id: input.paymentId },
        select: { totalAmount: true, paidAmount: true, downPayment: true, status: true }
      });
      // Nomor kuitansi mengikuti tanggal penerbitan (hari ini), supaya urutan nomor
      // tidak mundur bila tanggal bayar yang dicatat lebih lama.
      const receiptNumber = await nextNumber(tx, "KW", getJakartaToday());
      const receipt = await tx.paymentReceipt.create({
        data: {
          paymentId: input.paymentId,
          receiptNumber,
          amount: input.amount,
          paidAt: input.paidAt,
          method: input.method,
          note: input.note,
          receivedById: input.userId
        }
      });
      // Tambah secara atomik (baris terkunci sampai transaksi selesai), lalu hitung sisa & status.
      const after = await tx.payment.update({
        where: { id: input.paymentId },
        data: { paidAmount: { increment: input.amount }, paymentDate: input.paidAt, paymentMethod: input.method ?? undefined },
        select: { totalAmount: true, paidAmount: true, downPayment: true, status: true }
      });
      const total = Number(after.totalAmount);
      const paid = Number(after.paidAmount);
      const isFirst = paid - input.amount <= 0;
      await tx.payment.update({
        where: { id: input.paymentId },
        data: {
          remainingAmount: Math.max(total - paid, 0),
          status: derivePaymentStatus(total, paid, after.status === "REFUNDED"),
          // Pembayaran pertama dicatat sebagai uang muka bila belum lunas.
          downPayment: isFirst && Number(after.downPayment) <= 0 && paid < total ? input.amount : undefined
        }
      });
      return receipt;
    })
  );
}

/** Batalkan kuitansi (tidak dihapus): total dibayar dikurangi kembali. */
export async function voidReceipt(receiptId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.paymentReceipt.findUniqueOrThrow({
      where: { id: receiptId },
      select: { id: true, amount: true, voidedAt: true, paymentId: true }
    });
    if (r.voidedAt) return r;
    await tx.paymentReceipt.update({ where: { id: r.id }, data: { voidedAt: new Date(), voidReason: reason } });
    const after = await tx.payment.update({
      where: { id: r.paymentId },
      data: { paidAmount: { decrement: Number(r.amount) } },
      select: { totalAmount: true, paidAmount: true, status: true }
    });
    const total = Number(after.totalAmount);
    const paid = Math.max(Number(after.paidAmount), 0);
    await tx.payment.update({
      where: { id: r.paymentId },
      data: { paidAmount: paid, remainingAmount: Math.max(total - paid, 0), status: derivePaymentStatus(total, paid, after.status === "REFUNDED") }
    });
    return r;
  });
}

/* ------------------------------------------------------------------ */
/* Dokumen Word: Tagihan & Kuitansi                                     */
/* ------------------------------------------------------------------ */

const rp = (n: number) => `Rp ${formatThousands(n)}`;
const words = (n: number) => `${terbilang(n).replace(/^./, (c) => c.toUpperCase())} Rupiah`;
const kota = NOTARIS.kota.replace(/^Kota |^Kabupaten /, "");
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tglPanjang = (d: Date) => `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

function kop(): DocBlock[] {
  return [
    { t: "p", text: `**KANTOR NOTARIS ${NOTARIS.namaSingkat}**`, align: "center", spaceAfter: 0, size: 13 },
    { t: "p", text: NOTARIS.kedudukan, align: "center", spaceAfter: 240 }
  ];
}

export interface BillingDocData {
  invoiceNumber: string | null;
  createdAt: Date;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  notes: string | null;
  client: { fullName: string; clientNumber: string; address: string | null };
  job: { jobNumber: string; description: string | null; service: string | null } | null;
  receipts: { receiptNumber: string; amount: number; paidAt: Date; method: string | null; voidedAt: Date | null }[];
}

export function buildInvoiceDocx(d: BillingDocData): Buffer {
  const valid = d.receipts.filter((r) => !r.voidedAt);
  const legacy = Math.max(d.paidAmount - valid.reduce((n, r) => n + r.amount, 0), 0);
  const uraian = d.job ? `${d.job.service ?? "Jasa kenotariatan"}${d.job.description ? ` — ${d.job.description}` : ""}` : "Jasa kenotariatan";
  const blocks: DocBlock[] = [
    ...kop(),
    { t: "p", text: "TAGIHAN", bold: true, align: "center", size: 14, spaceAfter: 0 },
    { t: "p", text: `Nomor: ${d.invoiceNumber ?? "-"}`, align: "center", spaceAfter: 240 },
    { t: "p", text: `Kepada: **${d.client.fullName}** (${d.client.clientNumber})`, spaceAfter: 0 },
    ...(d.client.address ? [{ t: "p" as const, text: d.client.address, spaceAfter: 0 }] : []),
    { t: "p", text: `Pekerjaan: ${d.job ? d.job.jobNumber : "-"}`, spaceAfter: 240 },
    {
      t: "table",
      header: ["Uraian", "Jumlah"],
      widths: [7, 3],
      rows: [
        [uraian, rp(d.totalAmount)],
        // Pembayaran yang dicatat sebelum ada kuitansi bernomor.
        ...(legacy > 0 ? [["Pembayaran sebelumnya (tanpa kuitansi bernomor)", `- ${rp(legacy)}`]] : []),
        ...valid.map((r) => [`Dibayar ${formatDate(r.paidAt)} (${r.receiptNumber}${r.method ? `, ${r.method}` : ""})`, `- ${rp(r.amount)}`]),
        ["**Sisa yang harus dibayar**", `**${rp(d.remainingAmount)}**`]
      ]
    },
    { t: "p", text: `Terbilang sisa: ${d.remainingAmount > 0 ? words(d.remainingAmount) : "Lunas"}.`, spaceAfter: 120 },
    ...(d.notes ? [{ t: "p" as const, text: `Catatan: ${d.notes}` }] : []),
    { t: "p", text: `${kota}, ${tglPanjang(getJakartaToday())}`, align: "right", spaceAfter: 0 },
    { t: "p", text: "Hormat kami,", align: "right", spaceAfter: 1000 },
    { t: "p", text: NOTARIS.namaSingkat, bold: true, align: "right" }
  ];
  return buildSimpleDocx(blocks, { title: `Tagihan ${d.invoiceNumber ?? ""}` });
}

export function buildReceiptDocx(
  d: BillingDocData,
  r: { receiptNumber: string; amount: number; paidAt: Date; method: string | null; note: string | null; voidedAt: Date | null; receivedBy: string | null; paidBefore: number }
): Buffer {
  const uraian = d.job ? `${d.job.service ?? "jasa kenotariatan"}${d.job.description ? ` (${d.job.description})` : ""}, pekerjaan ${d.job.jobNumber}` : "jasa kenotariatan";
  const sisa = Math.max(d.totalAmount - r.paidBefore - r.amount, 0);
  const jenis = sisa <= 0 ? "pelunasan" : r.paidBefore <= 0 ? "uang muka" : "angsuran";
  const blocks: DocBlock[] = [
    ...kop(),
    { t: "p", text: r.voidedAt ? "KUITANSI — DIBATALKAN" : "KUITANSI", bold: true, align: "center", size: 14, spaceAfter: 0 },
    { t: "p", text: `Nomor: ${r.receiptNumber}`, align: "center", spaceAfter: 240 },
    {
      t: "table",
      header: ["", ""],
      noHeader: true,
      widths: [3, 7],
      rows: [
        ["Telah terima dari", d.client.fullName],
        ["Uang sejumlah", `**${rp(r.amount)}**`],
        ["Terbilang", words(r.amount)],
        ["Untuk pembayaran", `${jenis.charAt(0).toUpperCase()}${jenis.slice(1)} ${uraian}`],
        ["Cara bayar", r.method ?? "-"],
        ["Total tagihan", `${rp(d.totalAmount)} (No. ${d.invoiceNumber ?? "-"})`],
        ["Sisa setelah pembayaran ini", sisa > 0 ? rp(sisa) : "LUNAS"],
        ...(r.note ? [["Keterangan", r.note]] : [])
      ]
    },
    { t: "p", text: `${kota}, ${tglPanjang(r.paidAt)}`, align: "right", spaceAfter: 0 },
    { t: "p", text: "Penerima,", align: "right", spaceAfter: 1000 },
    { t: "p", text: r.receivedBy ?? "(..............................)", bold: true, align: "right", spaceAfter: 0 },
    { t: "p", text: `Kantor Notaris ${NOTARIS.namaSingkat}`, align: "right" }
  ];
  return buildSimpleDocx(blocks, { title: `Kuitansi ${r.receiptNumber}` });
}

/** Data lengkap untuk dokumen tagihan/kuitansi. */
export async function loadBillingDoc(paymentId: string): Promise<(BillingDocData & { clientId: string }) | null> {
  const p = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      clientId: true,
      invoiceNumber: true,
      createdAt: true,
      totalAmount: true,
      paidAmount: true,
      remainingAmount: true,
      notes: true,
      client: { select: { fullName: true, clientNumber: true, address: true } },
      job: { select: { jobNumber: true, description: true, serviceType: { select: { name: true } } } },
      receipts: { orderBy: { paidAt: "asc" }, select: { receiptNumber: true, amount: true, paidAt: true, method: true, voidedAt: true } }
    }
  });
  if (!p) return null;
  return {
    clientId: p.clientId,
    invoiceNumber: p.invoiceNumber,
    createdAt: p.createdAt,
    totalAmount: Number(p.totalAmount),
    paidAmount: Number(p.paidAmount),
    remainingAmount: Number(p.remainingAmount),
    notes: p.notes,
    client: p.client,
    job: p.job ? { jobNumber: p.job.jobNumber, description: p.job.description, service: p.job.serviceType?.name ?? null } : null,
    receipts: p.receipts.map((r) => ({ ...r, amount: Number(r.amount) }))
  };
}

/** Tagihan baru untuk pekerjaan (+ kuitansi uang muka bila sudah diterima). */
export async function createInvoiceForJob(input: {
  clientId: string;
  jobId: string;
  total: number;
  downPayment: number;
  method: string | null;
  userId: string;
}) {
  const p = await prisma.payment.create({
    data: { clientId: input.clientId, jobId: input.jobId, totalAmount: input.total, remainingAmount: input.total, status: "UNPAID" }
  });
  await ensureInvoiceNumber(p.id);
  if (input.downPayment > 0) {
    await recordReceipt({
      paymentId: p.id,
      amount: Math.min(input.downPayment, input.total),
      paidAt: getJakartaToday(),
      method: input.method,
      note: "Uang muka",
      userId: input.userId
    });
  }
  return p;
}
