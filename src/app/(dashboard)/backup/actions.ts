"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { createDatabaseBackup, exportProtocolYear } from "@/lib/compliance/backup";

export async function createBackupNow() {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.MANAGE_USERS);
  let ok = true;
  try {
    await createDatabaseBackup(user.id, "manual");
  } catch (err) {
    console.error("[backup] gagal", err);
    ok = false;
  }
  revalidatePath("/backup");
  redirect(ok ? "/backup?ok=backup" : "/backup?err=backup");
}

export async function exportProtocol(formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.MANAGE_USERS);
  const year = Number(formData.get("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) redirect("/backup?err=year");
  let missing = -1;
  try {
    missing = (await exportProtocolYear(year, user.id)).missing.length;
  } catch (err) {
    console.error("[backup] ekspor protokol gagal", err);
  }
  revalidatePath("/backup");
  redirect(missing < 0 ? "/backup?err=export" : `/backup?ok=export&missing=${missing}`);
}
