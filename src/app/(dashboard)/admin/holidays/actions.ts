"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";

/** Tambah hari libur nasional / cuti bersama (dipakai menghitung tenggat hari kerja). */
export async function addHoliday(formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.MANAGE_USERS);
  const date = String(formData.get("date") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || name.length < 2) redirect("/admin/holidays?err=invalid");
  const when = new Date(`${date}T00:00:00.000Z`);
  await prisma.holiday.upsert({ where: { date: when }, update: { name }, create: { date: when, name } });
  await writeAuditLog({ userId: user.id, action: "holiday_saved", entityType: "Holiday", entityId: date, newValue: { date, name } });
  revalidatePath("/admin/holidays");
  revalidatePath("/ppat");
  redirect("/admin/holidays?ok=1");
}

export async function removeHoliday(id: string) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.MANAGE_USERS);
  const row = await prisma.holiday.findUnique({ where: { id } });
  if (!row) return;
  await prisma.holiday.delete({ where: { id } });
  await writeAuditLog({ userId: user.id, action: "holiday_removed", entityType: "Holiday", entityId: row.date.toISOString().slice(0, 10), previousValue: { name: row.name } });
  revalidatePath("/admin/holidays");
  revalidatePath("/ppat");
}
