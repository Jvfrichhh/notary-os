"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { isYm, monthRange, type ReportKind } from "@/lib/compliance/monthly";

/** Notaris menandai laporan bulanan sudah dikirim (dicatat di audit log). */
export async function markReportSent(kind: ReportKind, ym: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);
  if ((kind !== "mpd" && kind !== "wasiat") || !isYm(ym)) return;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  await writeAuditLog({
    userId: user.id,
    action: "monthly_report_sent",
    entityType: "MonthlyReport",
    entityId: `${kind}:${ym}`,
    newValue: { kind, month: ym, note: note || undefined }
  });
  if (kind === "wasiat") {
    // Akta wasiat bulan itu otomatis berstatus "Dilaporkan".
    const { start, end } = monthRange(ym);
    await prisma.wasiat.updateMany({
      where: { date: { gte: start, lt: end }, status: { in: ["DIBUAT", "DICATAT"] } },
      data: { status: "DILAPORKAN" }
    });
    revalidatePath("/wasiat");
  }
  revalidatePath("/compliance");
  revalidatePath("/dashboard");
  redirect(`/compliance?month=${ym}&ok=${kind}`);
}
