"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";

/** Catat pengesahan fotokopi sesuai asli. Catatan tidak bisa dihapus; nomor tidak bisa diubah. */
export async function createCopyCertification(formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_LEGALISASI);
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const number = get("number");
  const date = get("date");
  const requesterName = get("requesterName");
  const documentTitle = get("documentTitle");
  const copies = Math.min(Math.max(Number(get("copies")) || 1, 1), 999);
  if (!number || number.length > 60 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || requesterName.length < 2 || documentTitle.length < 2) {
    redirect("/legalisir?err=invalid#catat");
  }
  if (await prisma.copyCertification.findUnique({ where: { number }, select: { id: true } })) redirect("/legalisir?err=nomor#catat");
  const row = await prisma.copyCertification.create({
    data: { number, date: new Date(`${date}T00:00:00.000Z`), requesterName, documentTitle: documentTitle.slice(0, 300), copies, notes: get("notes").slice(0, 1000) || null, createdById: user.id }
  });
  await writeAuditLog({ userId: user.id, action: "copy_certification_created", entityType: "CopyCertification", entityId: row.id, newValue: { number, date, documentTitle, copies } });
  revalidatePath("/legalisir");
  redirect("/legalisir?ok=1");
}
