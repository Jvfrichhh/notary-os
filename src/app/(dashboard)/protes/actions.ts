"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";

const INSTRUMENTS = ["Wesel", "Cek", "Surat Sanggup"];
const REASONS = ["Non-akseptasi", "Non-pembayaran"];

/** Catat protes baru di Buku Daftar Protes. Catatan tidak bisa dihapus; nomor tidak bisa diubah. */
export async function createProtes(formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const number = get("number");
  const date = get("date");
  const requesterName = get("requesterName");
  const againstName = get("againstName");
  const instrumentType = get("instrumentType");
  const reason = get("reason");
  const amountRaw = get("amount").replace(/[^\d]/g, "");
  if (
    !number ||
    number.length > 60 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    requesterName.length < 2 ||
    againstName.length < 2 ||
    !INSTRUMENTS.includes(instrumentType) ||
    !REASONS.includes(reason)
  ) {
    redirect("/protes?err=invalid#catat");
  }
  if (await prisma.protes.findUnique({ where: { number }, select: { id: true } })) redirect("/protes?err=nomor#catat");
  const row = await prisma.protes.create({
    data: {
      number,
      date: new Date(`${date}T00:00:00.000Z`),
      requesterName,
      againstName,
      instrumentType,
      instrumentNumber: get("instrumentNumber") || null,
      amount: amountRaw ? Number(amountRaw) : null,
      reason,
      notes: get("notes") || null,
      createdById: user.id
    }
  });
  await writeAuditLog({ userId: user.id, action: "protes_created", entityType: "Protes", entityId: row.id, newValue: { number, date, instrumentType, reason } });
  revalidatePath("/protes");
  redirect("/protes?ok=1");
}
