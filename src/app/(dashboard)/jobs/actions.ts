"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { VALID_TRANSITIONS } from "@/lib/jobStatus";
import { createNotification } from "@/lib/notifications";
import { createClientNotification } from "@/lib/clientNotifications";
import { portalStatusLabel } from "@/lib/portalLabels";
import { autoSetJobStatus, notifyJobPeople, onChecklistChanged } from "@/lib/jobAutomation";
import { userHasPermission } from "@/lib/permissions";
import { formatDate, formatDateJakarta, fromDateInput } from "@/lib/format";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import { issueCovernote } from "@/lib/covernote";
import { completeStage, jobStageDefs, undoStage } from "@/lib/ppatStages";
import type { JobPriority, JobStatus } from "@prisma/client";

/** Status yang hanya boleh diputuskan Notaris (pemberi perintah). */
const NOTARY_ONLY_STATUSES: JobStatus[] = ["READY_FOR_SIGNING", "COMPLETED", "CANCELLED"];

/** "Notaris" = pemegang izin create_jobs (pemberi perintah kerja). */
async function isNotaryLevel(userId: string) {
  return userHasPermission(userId, PERMISSIONS.CREATE_JOBS);
}

/** Kembali ke halaman job dengan pesan (ditampilkan sebagai banner). */
function backToJob(jobId: string, key: "ok" | "err", code: string): never {
  revalidateJob(jobId);
  redirect(`/jobs/${jobId}?${key}=${code}`);
}

function revalidateJob(jobId: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  revalidatePath("/deadlines");
  revalidatePath("/deeds");
  revalidatePath(`/portal/jobs/${jobId}`);
  revalidatePath("/portal");
}

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value.trim() : null;
}

export async function updateJobStatus(jobId: string, newStatus: JobStatus) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  // Transisi tidak valid (mis. status job sudah berubah di request lain,
  // dropdown di client jadi stale) -- diabaikan diam-diam, bukan throw,
  // konsisten dengan pola guard clause lain di modul ini & archive/actions.ts.
  const allowed = VALID_TRANSITIONS[job.status] ?? [];
  if (!allowed.includes(newStatus)) return;
  // Masuk ke "Diperiksa Notaris" hanya lewat tombol Ajukan (submitJobForReview), supaya Notaris diberi tahu.
  if (newStatus === "REVIEW") return;
  // Menyetujui untuk tanda tangan, menyelesaikan, dan membatalkan job adalah keputusan Notaris.
  if (!(await isNotaryLevel(user.id))) {
    if (NOTARY_ONLY_STATUSES.includes(newStatus)) return;
    // Pekerjaan yang sedang diperiksa / sudah disetujui Notaris tidak bisa ditarik staf.
    if (job.status === "REVIEW" || job.status === "READY_FOR_SIGNING") return;
  }

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: newStatus,
      completionDate: newStatus === "COMPLETED" ? new Date() : job.completionDate
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "job_status_changed",
    entityType: "Job",
    entityId: jobId,
    previousValue: { status: job.status },
    newValue: { status: updated.status }
  });

  // Portal klien: beri tahu klien dengan label versi klien (bukan istilah internal).
  await createClientNotification({
    clientId: job.clientId,
    type: "status_changed",
    message: `Status pekerjaan ${job.jobNumber} kini: ${portalStatusLabel(updated.status)}.`,
    relatedEntityType: "Job",
    relatedEntityId: job.id
  });
  revalidateJob(jobId);
}

export async function toggleChecklistItem(itemId: string, jobId: string) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);

  // Item harus milik job ini (mencegah id dari job lain).
  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, checklist: { jobId } },
    select: { id: true, label: true, status: true, reviewStatus: true, checklist: { select: { job: { select: { jobNumber: true, clientId: true } } } } }
  });
  if (!item) return;
  const nextStatus = item.status === "COMPLETE" ? "MISSING" : "COMPLETE";
  // Centang manual = dokumen diterima kantor; batal centang mengembalikan ke belum diperiksa.
  const nextReview = nextStatus === "COMPLETE" ? "ACCEPTED" : item.reviewStatus === "ACCEPTED" ? null : item.reviewStatus;

  await prisma.checklistItem.update({
    where: { id: item.id },
    data: {
      status: nextStatus,
      reviewStatus: nextReview,
      reviewNote: nextStatus === "COMPLETE" ? null : undefined,
      reviewedAt: nextStatus === "COMPLETE" ? new Date() : undefined,
      reviewedById: nextStatus === "COMPLETE" ? user.id : undefined
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "checklist_item_toggled",
    entityType: "ChecklistItem",
    entityId: itemId,
    previousValue: { status: item.status, reviewStatus: item.reviewStatus },
    newValue: { status: nextStatus, reviewStatus: nextReview }
  });

  if (nextStatus === "COMPLETE") {
    const job = item.checklist.job;
    await createClientNotification({
      clientId: job.clientId,
      type: "document_reviewed",
      message: `Dokumen "${item.label}" untuk ${job.jobNumber} sudah diterima kantor.`,
      relatedEntityType: "Job",
      relatedEntityId: jobId
    });
    await onChecklistChanged(jobId, user.id);
  }

  revalidateJob(jobId);
}

export async function addJobTask(jobId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const job0 = await prisma.job.findUnique({ where: { id: jobId }, select: { picId: true } });
  if (!job0) return;
  // Penanggung jawab harus akun internal yang aktif.
  let assignee = toNullable(String(formData.get("assignedTo") ?? ""));
  if (assignee && !(await prisma.user.count({ where: { id: assignee, isActive: true } }))) assignee = null;
  const task = await prisma.jobTask.create({
    data: {
      jobId,
      title: title.slice(0, 300),
      // Tanpa pilihan khusus, tugas baru menjadi tanggung jawab PIC job.
      assignedTo: assignee ?? job0.picId ?? null,
      dueDate: fromDateInput(String(formData.get("dueDate") ?? ""))
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "task_added",
    entityType: "JobTask",
    entityId: task.id,
    newValue: task
  });

  if (task.assignedTo) {
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { jobNumber: true } });
    await createNotification({
      userId: task.assignedTo,
      type: "assignment",
      message: `Anda mendapat tugas baru "${task.title}"${job ? ` pada Job ${job.jobNumber}` : ""}.`,
      relatedEntityType: "Job",
      relatedEntityId: jobId
    });
  }

  revalidatePath(`/jobs/${jobId}`);
}

/** Wrapper form-friendly untuk dropdown ganti status di halaman detail job. */
export async function changeJobStatusForm(jobId: string, formData: FormData) {
  const newStatus = formData.get("status") as JobStatus | null;
  if (!newStatus) return;
  await updateJobStatus(jobId, newStatus);
}

export async function toggleTaskStatus(taskId: string, jobId: string) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);

  const task = await prisma.jobTask.findFirst({ where: { id: taskId, jobId } });
  if (!task) return;
  const nextStatus = task.status === "DONE" ? "TODO" : "DONE";

  await prisma.jobTask.update({
    where: { id: taskId },
    data: { status: nextStatus, completedAt: nextStatus === "DONE" ? new Date() : null }
  });

  await writeAuditLog({
    userId: user.id,
    action: "task_status_toggled",
    entityType: "JobTask",
    entityId: taskId,
    previousValue: { status: task.status },
    newValue: { status: nextStatus }
  });

  revalidatePath(`/jobs/${jobId}`);
}

/**
 * Staff memeriksa dokumen yang diunggah KLIEN lewat portal untuk satu item
 * checklist. decision:
 *  - "ACCEPTED"       -> item COMPLETE, reviewStatus ACCEPTED
 *  - "NEEDS_REVISION" -> item tetap MISSING, reviewStatus NEEDS_REVISION +
 *                        catatan (wajib) yang ditampilkan ke klien
 * Butuh EDIT_JOBS. Klien diberi notifikasi.
 */
export async function reviewChecklistDocument(itemId: string, jobId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);

  const decision = formData.get("decision");
  const note = String(formData.get("note") ?? "").trim();
  if (decision !== "ACCEPTED" && decision !== "NEEDS_REVISION") return;
  if (decision === "NEEDS_REVISION" && note.length < 3) return; // catatan wajib agar klien tahu apa yang harus diperbaiki

  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, checklist: { jobId } },
    select: {
      id: true,
      label: true,
      status: true,
      reviewStatus: true,
      attachedDocumentId: true,
      checklist: { select: { job: { select: { id: true, jobNumber: true, clientId: true } } } }
    }
  });
  if (!item || !item.attachedDocumentId) return; // tidak ada unggahan untuk diperiksa

  const accepted = decision === "ACCEPTED";
  await prisma.checklistItem.update({
    where: { id: item.id },
    data: {
      status: accepted ? "COMPLETE" : "MISSING",
      reviewStatus: decision,
      reviewNote: accepted ? null : note,
      reviewedAt: new Date(),
      reviewedById: user.id
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: accepted ? "client_document_accepted" : "client_document_revision_requested",
    entityType: "ChecklistItem",
    entityId: item.id,
    previousValue: { status: item.status, reviewStatus: item.reviewStatus },
    newValue: { status: accepted ? "COMPLETE" : "MISSING", reviewStatus: decision, note: accepted ? undefined : note }
  });

  const job = item.checklist.job;
  await createClientNotification({
    clientId: job.clientId,
    type: "document_reviewed",
    message: accepted
      ? `Dokumen "${item.label}" untuk ${job.jobNumber} telah DITERIMA.`
      : `Dokumen "${item.label}" untuk ${job.jobNumber} perlu diperbaiki: ${note}`,
    relatedEntityType: "Job",
    relatedEntityId: job.id
  });

  await onChecklistChanged(job.id, user.id, { revision: !accepted });
  revalidateJob(job.id);
}

/* ------------------------------------------------------------------ */
/* Alur periksa Notaris (tanpa tabel baru: memakai status REVIEW).      */
/* ------------------------------------------------------------------ */

/** Staf/PIC mengajukan pekerjaan untuk diperiksa Notaris. */
export async function submitJobForReview(jobId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { jobNumber: true, serviceType: { select: { name: true } }, _count: { select: { deedDrafts: true } } }
  });
  if (!job) return;
  // Layanan yang punya template akta wajib punya draft sebelum diajukan.
  const needsDraft = !!SERVICE_CATALOG.find((c) => c.name === job.serviceType?.name)?.deedKey;
  if (needsDraft && job._count.deedDrafts === 0) backToJob(jobId, "err", "nodraft");
  const moved = await autoSetJobStatus(jobId, "REVIEW", note ? `diajukan: ${note}` : "diajukan ke Notaris", user.id);
  if (!moved) backToJob(jobId, "err", "submit");
  await notifyJobPeople(
    jobId,
    `${user.name ?? "Staf"} mengajukan ${job.jobNumber} untuk diperiksa${note ? `: ${note}` : "."}`,
    { notary: true }
  );
  backToJob(jobId, "ok", "submitted");
}

/** Notaris menyetujui: job siap ditandatangani; PIC diberi tahu. */
export async function approveJobReview(jobId: string) {
  const user = await requireUser();
  if (!(await isNotaryLevel(user.id))) return;
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { jobNumber: true } });
  if (!job) return;
  const moved = await autoSetJobStatus(jobId, "READY_FOR_SIGNING", "disetujui Notaris", user.id, { onlyFrom: ["REVIEW"] });
  if (!moved) backToJob(jobId, "err", "state");
  await notifyJobPeople(jobId, `Notaris menyetujui ${job.jobNumber}; siapkan penandatanganan.`, { pic: true });
  backToJob(jobId, "ok", "approved");
}

/** Notaris meminta revisi: job kembali dikerjakan, catatan masuk ke catatan job & notifikasi PIC. */
export async function requestJobRevision(jobId: string, formData: FormData) {
  const user = await requireUser();
  if (!(await isNotaryLevel(user.id))) return;
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (note.length < 3) backToJob(jobId, "err", "note");
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { jobNumber: true, notes: true } });
  if (!job) return;
  const moved = await autoSetJobStatus(jobId, "IN_PROGRESS", `revisi: ${note}`, user.id, { onlyFrom: ["REVIEW", "READY_FOR_SIGNING"] });
  if (!moved) backToJob(jobId, "err", "state");
  const stamp = formatDateJakarta(new Date());
  await prisma.job.update({
    where: { id: jobId },
    data: { notes: `${job.notes ? `${job.notes}\n` : ""}[${stamp}] Revisi dari Notaris: ${note}` }
  });
  await notifyJobPeople(jobId, `Notaris minta revisi ${job.jobNumber}: ${note}`, { pic: true });
  backToJob(jobId, "ok", "revision");
}

/* ------------------------------------------------------------------ */
/* Ubah data job (Notaris): PIC, target, prioritas, keterangan, catatan */
/* ------------------------------------------------------------------ */

const jobEditSchema = z.object({
  picId: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  description: z.string().max(500).optional(),
  notes: z.string().max(5000).optional()
});

export async function updateJobDetails(jobId: string, formData: FormData) {
  const user = await requireUser();
  if (!(await isNotaryLevel(user.id))) return;

  const parsed = jobEditSchema.safeParse({
    picId: String(formData.get("picId") ?? ""),
    deadline: String(formData.get("deadline") ?? ""),
    priority: String(formData.get("priority") ?? "NORMAL"),
    description: String(formData.get("description") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });
  if (!parsed.success) backToJob(jobId, "err", "edit");
  const d = parsed.data;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.status === "COMPLETED" || job.status === "CANCELLED") return;

  const picId = toNullable(d.picId);
  if (picId) {
    const pic = await prisma.user.findFirst({ where: { id: picId, isActive: true }, select: { id: true } });
    if (!pic) backToJob(jobId, "err", "pic");
  }
  // Kolom tanggal-saja disimpan UTC-midnight (lihat lib/format.ts).
  const deadline = d.deadline ? fromDateInput(d.deadline) : null;
  if (d.deadline && !deadline) backToJob(jobId, "err", "edit");

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      picId,
      deadline,
      priority: d.priority as JobPriority,
      description: toNullable(d.description),
      notes: toNullable(d.notes),
      // Bila belum ada Notaris penanggung jawab, Notaris yang mengubah menjadi penanggung jawab.
      notaryId: job.notaryId ?? user.id
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "job_updated",
    entityType: "Job",
    entityId: jobId,
    previousValue: { picId: job.picId, deadline: job.deadline, priority: job.priority, description: job.description, notes: job.notes },
    newValue: { picId: updated.picId, deadline: updated.deadline, priority: updated.priority, description: updated.description, notes: updated.notes }
  });

  if (picId && picId !== job.picId) {
    // Tugas yang belum selesai milik PIC lama / belum ditugaskan ikut pindah ke PIC baru.
    await prisma.jobTask.updateMany({
      where: { jobId, status: { not: "DONE" }, OR: [{ assignedTo: null }, ...(job.picId ? [{ assignedTo: job.picId }] : [])] },
      data: { assignedTo: picId }
    });
    await createNotification({
      userId: picId,
      type: "assignment",
      message: `Anda ditugaskan sebagai PIC pada Job ${job.jobNumber}.`,
      relatedEntityType: "Job",
      relatedEntityId: jobId
    });
    await autoSetJobStatus(jobId, "IN_PROGRESS", "PIC ditentukan", user.id, { onlyFrom: ["INBOX"] });
  } else if (updated.picId && (job.deadline?.getTime() ?? 0) !== (deadline?.getTime() ?? 0)) {
    await createNotification({
      userId: updated.picId,
      type: "deadline",
      message: `Target ${job.jobNumber} diubah menjadi ${formatDate(deadline)}.`,
      relatedEntityType: "Job",
      relatedEntityId: jobId
    });
  }

  backToJob(jobId, "ok", "edited");
}

/** Notaris mengatur tenggat tugas (mis. menyesuaikan tenggat kewajiban hukum). */
export async function updateTaskDueDate(taskId: string, jobId: string, formData: FormData) {
  const user = await requireUser();
  if (!(await isNotaryLevel(user.id))) return;
  const raw = String(formData.get("dueDate") ?? "");
  const dueDate = raw ? fromDateInput(raw) : null;
  if (raw && !dueDate) return;
  const task = await prisma.jobTask.findFirst({ where: { id: taskId, jobId }, select: { id: true, dueDate: true } });
  if (!task) return;
  await prisma.jobTask.update({ where: { id: task.id }, data: { dueDate } });
  await writeAuditLog({
    userId: user.id,
    action: "task_due_changed",
    entityType: "JobTask",
    entityId: task.id,
    previousValue: { dueDate: task.dueDate },
    newValue: { dueDate }
  });
  revalidateJob(jobId);
  revalidatePath("/compliance");
}

/** Buat covernote untuk bank (Notaris/PPAT); file Word masuk Document Vault pekerjaan. */
export async function createCovernote(jobId: string, formData: FormData) {
  const user = await requireUser();
  if (!(await isNotaryLevel(user.id))) return;
  const bank = String(formData.get("bank") ?? "").trim().slice(0, 200);
  const debtor = String(formData.get("debtor") ?? "").trim().slice(0, 200);
  const items = String(formData.get("items") ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 15);
  if (!bank || !debtor || items.length === 0) backToJob(jobId, "err", "covernote");
  const { documentId, number } = await issueCovernote(
    jobId,
    {
      bank,
      bankAddress: String(formData.get("bankAddress") ?? "").trim().slice(0, 300) || null,
      debtor,
      items,
      estimate: fromDateInput(String(formData.get("estimate") ?? "")),
      estimateText: null,
      note: String(formData.get("note") ?? "").trim().slice(0, 1000) || null
    },
    user.id
  );
  revalidateJob(jobId);
  revalidatePath("/documents");
  redirect(`/jobs/${jobId}?ok=covernote&doc=${documentId}&cn=${encodeURIComponent(number)}`);
}

/** Tandai / batalkan satu langkah proses PPAT pada pekerjaan. */
export async function setPpatStage(jobId: string, step: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);
  // Hanya langkah yang berlaku untuk jenis akta PPAT pekerjaan ini.
  if (!(await jobStageDefs(jobId)).some((d) => d.key === step)) return;
  if (formData.get("undo") === "1") {
    if (!(await isNotaryLevel(user.id))) return;
    await undoStage(jobId, step, user.id);
  } else {
    await completeStage(jobId, step, {
      userId: user.id,
      date: fromDateInput(String(formData.get("date") ?? "")) ?? new Date(),
      reference: String(formData.get("reference") ?? "").trim().slice(0, 200) || null
    });
  }
  revalidateJob(jobId);
}
