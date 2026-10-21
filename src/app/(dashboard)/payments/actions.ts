"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { createInvoiceForJob, ensureInvoiceNumber, recordReceipt, voidReceipt } from "@/lib/billing";
import { fromDateInput, getJakartaToday } from "@/lib/format";

function toNullable(value: FormDataEntryValue | null | undefined) {
  const v = typeof value === "string" ? value.trim() : "";
  return v === "" ? null : v;
}

function toDecimalInput(value: FormDataEntryValue | null) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Status SELALU diturunkan dari angka (totalAmount vs paidAmount), tidak
 * dipercaya langsung dari pilihan dropdown -- supaya tidak mungkin ada
 * kombinasi tidak konsisten (mis. status "PAID" tapi remainingAmount > 0).
 * Pengecualian: REFUNDED tetap pilihan manual eksplisit, karena refund
 * adalah keputusan bisnis yang tidak bisa disimpulkan dari angka semata.
 */
function derivePaymentStatus(totalAmount: number, paidAmount: number, chosenStatus: string) {
  if (chosenStatus === "REFUNDED") return "REFUNDED" as const;
  if (paidAmount <= 0) return "UNPAID" as const;
  if (totalAmount > 0 && paidAmount >= totalAmount) return "PAID" as const;
  return "PARTIALLY_PAID" as const;
}

const schema = z.object({
  clientId: z.string().min(1, "Client wajib dipilih"),
  jobId: z.string().optional(),
  totalAmount: z.string(),
  downPayment: z.string(),
  paidAmount: z.string(),
  status: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED"]).default("UNPAID"),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional()
});

export type PaymentFormState = {
  errors?: Record<string, string[]>;
  formError?: string;
};

export async function createPayment(_prevState: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_FINANCE);

  const parsed = schema.safeParse({
    clientId: formData.get("clientId"),
    jobId: formData.get("jobId") || undefined,
    totalAmount: formData.get("totalAmount") ?? "0",
    downPayment: formData.get("downPayment") ?? "0",
    paidAmount: formData.get("paidAmount") ?? "0",
    status: formData.get("status") || "UNPAID",
    paymentDate: formData.get("paymentDate") || undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
    notes: formData.get("notes") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) return { formError: "Client tidak ditemukan." };

  const jobId = toNullable(data.jobId ?? "");
  if (jobId) {
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, clientId: true } });
    if (!job) return { formError: "Job tidak ditemukan." };
    if (job.clientId !== data.clientId) return { formError: "Job yang dipilih bukan milik client tersebut." };
  }

  const totalAmount = toDecimalInput(data.totalAmount);
  const paidAmount = toDecimalInput(data.paidAmount);
  const downPayment = toDecimalInput(data.downPayment);
  // remainingAmount SELALU dihitung server-side dari totalAmount - paidAmount,
  // tidak dipercaya dari input mentah -- supaya tidak ada data payment yang
  // tidak konsisten.
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  const status = derivePaymentStatus(totalAmount, paidAmount, data.status);

  // Tagihan dibuat dulu (belum dibayar); uang yang sudah diterima dicatat
  // sebagai kuitansi bernomor agar riwayat pembayarannya lengkap.
  const created = await prisma.payment.create({
    data: {
      clientId: data.clientId,
      jobId,
      totalAmount,
      downPayment: 0,
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: status === "REFUNDED" ? "REFUNDED" : "UNPAID",
      paymentMethod: toNullable(data.paymentMethod ?? ""),
      notes: toNullable(data.notes ?? "")
    }
  });
  await ensureInvoiceNumber(created.id);
  if (paidAmount > 0) {
    await recordReceipt({
      paymentId: created.id,
      amount: paidAmount,
      paidAt: (data.paymentDate && fromDateInput(data.paymentDate)) || getJakartaToday(),
      method: toNullable(data.paymentMethod ?? ""),
      note: downPayment > 0 && downPayment === paidAmount ? "Uang muka" : null,
      userId: user.id
    });
  }
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: created.id } });

  await writeAuditLog({
    userId: user.id,
    action: "payment_created",
    entityType: "Payment",
    entityId: payment.id,
    newValue: { clientId: payment.clientId, totalAmount, paidAmount, status: payment.status }
  });

  revalidatePath("/payments");
  if (jobId) revalidatePath(`/jobs/${jobId}`);
  redirect(`/payments/${payment.id}?ok=created`);
}

export async function updatePayment(id: string, _prevState: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_FINANCE);

  const before = await prisma.payment.findUnique({ where: { id } });
  if (!before) return { formError: "Payment tidak ditemukan." };

  const parsed = schema.omit({ clientId: true, jobId: true }).safeParse({
    totalAmount: formData.get("totalAmount") ?? "0",
    downPayment: formData.get("downPayment") ?? "0",
    paidAmount: formData.get("paidAmount") ?? "0",
    status: formData.get("status") || "UNPAID",
    paymentDate: formData.get("paymentDate") || undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
    notes: formData.get("notes") || undefined
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const totalAmount = toDecimalInput(data.totalAmount);
  // Bila sudah ada kuitansi, "sudah dibayar" hanya berubah lewat kuitansi.
  const hasReceipts = (await prisma.paymentReceipt.count({ where: { paymentId: id } })) > 0;
  const paidAmount = hasReceipts ? Number(before.paidAmount) : toDecimalInput(data.paidAmount);
  const downPayment = hasReceipts ? Number(before.downPayment) : toDecimalInput(data.downPayment);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  const status = derivePaymentStatus(totalAmount, paidAmount, data.status);

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      totalAmount,
      downPayment,
      paidAmount,
      remainingAmount,
      status,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
      paymentMethod: toNullable(data.paymentMethod ?? ""),
      notes: toNullable(data.notes ?? "")
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "payment_updated",
    entityType: "Payment",
    entityId: id,
    previousValue: { totalAmount: before.totalAmount, paidAmount: before.paidAmount, status: before.status },
    newValue: { totalAmount: payment.totalAmount, paidAmount: payment.paidAmount, status: payment.status }
  });

  revalidatePath("/payments");
  if (payment.jobId) revalidatePath(`/jobs/${payment.jobId}`);
  if (!payment.invoiceNumber) await ensureInvoiceNumber(payment.id);
  redirect(`/payments/${payment.id}?ok=updated`);
}

async function setRecordStatus(id: string, recordStatus: "ACTIVE" | "ARCHIVED") {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_FINANCE);
  const before = await prisma.payment.findUnique({ where: { id } });
  if (!before) return;
  const updated = await prisma.payment.update({ where: { id }, data: { recordStatus } });
  await writeAuditLog({
    userId: user.id,
    action: recordStatus === "ARCHIVED" ? "payment_archived" : "payment_restored",
    entityType: "Payment",
    entityId: id,
    previousValue: { recordStatus: before.recordStatus },
    newValue: { recordStatus: updated.recordStatus }
  });
  revalidatePath("/payments");
}

export async function archivePayment(id: string) {
  return setRecordStatus(id, "ARCHIVED");
}
export async function restorePayment(id: string) {
  return setRecordStatus(id, "ACTIVE");
}

/** Catat uang masuk (DP / angsuran / pelunasan) -> kuitansi bernomor. */
export async function recordPayment(paymentId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_FINANCE);
  const amount = Math.round(Number(String(formData.get("amount") ?? "").replace(/\D/g, "")));
  const paidAt = fromDateInput(String(formData.get("paidAt") ?? "")) ?? getJakartaToday();
  const method = toNullable(formData.get("method"));
  const note = toNullable(formData.get("note"));
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true, jobId: true, remainingAmount: true, recordStatus: true } });
  if (!payment) redirect("/payments");
  if (!Number.isFinite(amount) || amount <= 0) redirect(`/payments/${paymentId}?err=amount`);
  const remaining = Number(payment.remainingAmount);
  if (remaining > 0 && amount > remaining) redirect(`/payments/${paymentId}?err=over`);

  await ensureInvoiceNumber(paymentId);
  const receipt = await recordReceipt({ paymentId, amount, paidAt, method, note, userId: user.id });
  await writeAuditLog({
    userId: user.id,
    action: "payment_received",
    entityType: "Payment",
    entityId: paymentId,
    newValue: { receiptNumber: receipt.receiptNumber, amount, paidAt, method }
  });
  revalidatePath("/payments");
  if (payment.jobId) revalidatePath(`/jobs/${payment.jobId}`);
  redirect(`/payments/${paymentId}?ok=receipt&r=${receipt.id}`);
}

/** Batalkan kuitansi yang salah (tetap tersimpan, ditandai dibatalkan). */
export async function cancelReceipt(receiptId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_FINANCE);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  const r = await prisma.paymentReceipt.findUnique({ where: { id: receiptId }, select: { paymentId: true, receiptNumber: true, payment: { select: { jobId: true } } } });
  if (!r) redirect("/payments");
  if (reason.length < 3) redirect(`/payments/${r.paymentId}?err=reason`);
  await voidReceipt(receiptId, reason);
  await writeAuditLog({ userId: user.id, action: "receipt_voided", entityType: "PaymentReceipt", entityId: receiptId, newValue: { receiptNumber: r.receiptNumber, reason } });
  revalidatePath("/payments");
  if (r.payment.jobId) revalidatePath(`/jobs/${r.payment.jobId}`);
  redirect(`/payments/${r.paymentId}?ok=voided`);
}

/** Buat tagihan langsung dari kartu Pembayaran di halaman job. */
export async function createInvoiceFromJob(jobId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_FINANCE);
  const num = (k: string) => Math.round(Number(String(formData.get(k) ?? "").replace(/\D/g, "")) || 0);
  const fee = num("fee");
  const dp = num("dp");
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, clientId: true, payments: { select: { id: true } } } });
  if (!job || fee <= 0) redirect(`/jobs/${jobId}`);
  // Sudah ada tagihan (mis. klik dua kali) -> buka tagihan yang ada.
  if (job.payments.length > 0) redirect(`/payments/${job.payments[0].id}`);
  const p = await createInvoiceForJob({
    clientId: job.clientId,
    jobId,
    total: fee,
    downPayment: dp,
    method: toNullable(formData.get("method")),
    userId: user.id
  });
  await writeAuditLog({ userId: user.id, action: "payment_created", entityType: "Payment", entityId: p.id, newValue: { jobId, total: fee, dp } });
  revalidatePath("/payments");
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/payments/${p.id}?ok=created`);
}
