"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { VALID_TRANSITIONS } from "@/lib/jobStatus";
import { generateJobNumber } from "@/lib/idGenerators";
import { createNotification } from "@/lib/notifications";
import type { JobStatus } from "@prisma/client";

const jobSchema = z.object({
  clientId: z.string().min(1, "Client wajib dipilih"),
  visitId: z.string().optional().or(z.literal("")),
  serviceTypeId: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  deadline: z.string().optional().or(z.literal("")),
  picId: z.string().optional().or(z.literal("")),
  reviewerId: z.string().optional().or(z.literal("")),
  notaryId: z.string().optional().or(z.literal(""))
});

export type JobFormState = {
  errors?: Partial<Record<keyof z.infer<typeof jobSchema>, string[]>>;
  formError?: string;
};

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value.trim() : null;
}

/**
 * Job Creation Flow (Blueprint §30): setelah job dibuat, sistem otomatis
 * membuat checklist + task dari Service Template (jika template tersedia
 * untuk service type yang dipilih). Ini yang menghindarkan staff bikin
 * workflow dari nol setiap kali (Blueprint §29).
 */
export async function createJob(_prevState: JobFormState, formData: FormData): Promise<JobFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.CREATE_JOBS);

  const parsed = jobSchema.safeParse({
    clientId: formData.get("clientId"),
    visitId: formData.get("visitId") || "",
    serviceTypeId: formData.get("serviceTypeId") || "",
    description: formData.get("description") || "",
    priority: formData.get("priority") || "NORMAL",
    deadline: formData.get("deadline") || "",
    picId: formData.get("picId") || "",
    reviewerId: formData.get("reviewerId") || "",
    notaryId: formData.get("notaryId") || ""
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const visitId = toNullable(data.visitId);
  const serviceTypeId = toNullable(data.serviceTypeId);

  const jobNumber = await generateJobNumber();

  const job = await prisma.job.create({
    data: {
      jobNumber,
      clientId: data.clientId,
      visitId,
      serviceTypeId,
      description: toNullable(data.description),
      priority: data.priority,
      status: "INBOX",
      deadline: data.deadline ? new Date(data.deadline) : null,
      picId: toNullable(data.picId),
      reviewerId: toNullable(data.reviewerId),
      notaryId: toNullable(data.notaryId),
      startDate: new Date()
    }
  });

  // Auto-generate checklist + tasks dari Service Template, kalau ada.
  if (serviceTypeId) {
    const template = await prisma.serviceTemplate.findFirst({ where: { serviceTypeId } });

    if (template?.defaultChecklist) {
      const checklist = await prisma.jobChecklist.create({
        data: { jobId: job.id, templateId: template.id }
      });

      const items = template.defaultChecklist as { label: string; isRequired?: boolean }[];
      if (Array.isArray(items) && items.length > 0) {
        await prisma.checklistItem.createMany({
          data: items.map((item) => ({
            checklistId: checklist.id,
            label: item.label,
            isRequired: item.isRequired ?? true
          }))
        });
      }
    }

    if (template?.defaultTasks) {
      const tasks = template.defaultTasks as { title: string; description?: string }[];
      if (Array.isArray(tasks) && tasks.length > 0) {
        await prisma.jobTask.createMany({
          data: tasks.map((t) => ({
            jobId: job.id,
            title: t.title,
            description: t.description ?? null
          }))
        });
      }
    }
  }

  await writeAuditLog({
    userId: user.id,
    action: "job_created",
    entityType: "Job",
    entityId: job.id,
    newValue: job
  });

  if (job.picId) {
    await createNotification({
      userId: job.picId,
      type: "assignment",
      message: `Anda ditugaskan sebagai PIC pada Job ${job.jobNumber}.`,
      relatedEntityType: "Job",
      relatedEntityId: job.id
    });
  }

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/deadlines");
  if (visitId) revalidatePath(`/visits/${visitId}`);
  redirect(`/jobs/${job.id}`);
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

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  revalidatePath("/deadlines");
}

export async function toggleChecklistItem(itemId: string, jobId: string) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);

  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  const nextStatus = item.status === "COMPLETE" ? "MISSING" : "COMPLETE";

  await prisma.checklistItem.update({ where: { id: itemId }, data: { status: nextStatus } });

  await writeAuditLog({
    userId: user.id,
    action: "checklist_item_toggled",
    entityType: "ChecklistItem",
    entityId: itemId,
    previousValue: { status: item.status },
    newValue: { status: nextStatus }
  });

  revalidatePath(`/jobs/${jobId}`);
}

export async function addJobTask(jobId: string, formData: FormData) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_JOBS);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const task = await prisma.jobTask.create({
    data: { jobId, title, assignedTo: toNullable(String(formData.get("assignedTo") ?? "")) }
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

  const task = await prisma.jobTask.findUnique({ where: { id: taskId } });
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
