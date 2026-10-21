"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { fromDateInput, getJakartaToday } from "@/lib/format";
import { markSubmittedToBpn, registerPpatDeed, type PpatInput } from "@/lib/ppat";
import { PPAT_DEED_TYPES } from "@/lib/serviceCatalog";

const txt = (f: FormData, k: string, max = 300) => {
  const v = String(f.get(k) ?? "").trim().slice(0, max);
  return v || null;
};
const money = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").replace(/\D/g, "");
  return v ? Number(v) : null;
};
const date = (f: FormData, k: string) => fromDateInput(String(f.get(k) ?? ""));

/** Isian form -> data akta PPAT; null bila isian wajib kosong. */
function parse(f: FormData): Omit<PpatInput, "jobId" | "clientId"> | null {
  const deedDate = date(f, "deedDate");
  const deedType = String(f.get("deedType") ?? "");
  const partyFrom = txt(f, "partyFrom", 500);
  const partyTo = txt(f, "partyTo", 500);
  if (!deedDate || !(PPAT_DEED_TYPES as readonly string[]).includes(deedType) || !partyFrom || !partyTo) return null;
  return {
    deedDate,
    deedType,
    partyFrom,
    partyTo,
    rightType: txt(f, "rightType"),
    location: txt(f, "location"),
    landArea: txt(f, "landArea", 50),
    buildingArea: txt(f, "buildingArea", 50),
    transactionValue: money(f, "transactionValue"),
    njopValue: money(f, "njopValue"),
    nop: txt(f, "nop", 50),
    sspDate: date(f, "sspDate"),
    sspAmount: money(f, "sspAmount"),
    sspdDate: date(f, "sspdDate"),
    sspdAmount: money(f, "sspdAmount"),
    notes: txt(f, "notes", 1000)
  };
}

export async function createPpatDeed(formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);
  const jobId = txt(formData, "jobId", 40);
  const back = `/ppat/new${jobId ? `?jobId=${jobId}&` : "?"}`;
  const data = parse(formData);
  if (!data) redirect(`${back}err=required`);
  let clientId: string | null = null;
  if (jobId) {
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { clientId: true } });
    if (!job) redirect(`${back}err=job`);
    clientId = job.clientId;
  }
  const seqRaw = String(formData.get("sequence") ?? "").replace(/\D/g, "");
  let id: string;
  try {
    id = (await registerPpatDeed({ ...data, jobId, clientId }, user.id, seqRaw ? Number(seqRaw) : undefined)).id;
  } catch (err) {
    console.error("[ppat] gagal mendaftarkan", err);
    redirect(`${back}err=number`);
  }
  revalidatePath("/ppat");
  revalidatePath("/compliance");
  if (jobId) revalidatePath(`/jobs/${jobId}`);
  redirect(`/ppat/${id}?ok=created`);
}

export async function updatePpatDeed(id: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);
  const data = parse(formData);
  if (!data) redirect(`/ppat/${id}?err=required`);
  const before = await prisma.ppatDeed.findUnique({ where: { id } });
  if (!before) redirect("/ppat");
  // Nomor & tahun tetap; tanggal boleh dikoreksi dalam tahun yang sama.
  if (data.deedDate.getUTCFullYear() !== before.year) redirect(`/ppat/${id}?err=year`);
  await prisma.ppatDeed.update({ where: { id }, data });
  await writeAuditLog({ userId: user.id, action: "ppat_deed_updated", entityType: "PpatDeed", entityId: id, previousValue: before, newValue: data });
  revalidatePath("/ppat");
  redirect(`/ppat/${id}?ok=updated`);
}

export async function submitPpatToBpn(id: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);
  const d = fromDateInput(String(formData.get("date") ?? "")) ?? getJakartaToday();
  const deed = await markSubmittedToBpn(id, d, user.id);
  revalidatePath("/ppat");
  revalidatePath("/compliance");
  if (deed.jobId) revalidatePath(`/jobs/${deed.jobId}`);
  redirect(`/ppat/${id}?ok=bpn`);
}
