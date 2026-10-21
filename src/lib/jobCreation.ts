import type { JobPriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateJobNumber } from "@/lib/idGenerators";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

/**
 * Satu-satunya cara membuat Job beserta checklist + tugas dari Service
 * Template (Blueprint §30). Dipakai oleh form "Buat Job" dan form "Tambah
 * Klien" (yang langsung membuat job). Pemanggil wajib sudah memeriksa izin
 * CREATE_JOBS.
 */
export async function createJobWithTemplate(
  input: {
    clientId: string;
    visitId?: string | null;
    serviceTypeId?: string | null;
    description?: string | null;
    priority?: JobPriority;
    deadline?: Date | null;
    picId?: string | null;
    reviewerId?: string | null;
    notaryId?: string | null;
  },
  createdByUserId: string
) {
  const jobNumber = await generateJobNumber();

  const job = await prisma.job.create({
    data: {
      jobNumber,
      clientId: input.clientId,
      visitId: input.visitId ?? null,
      serviceTypeId: input.serviceTypeId ?? null,
      description: input.description ?? null,
      priority: input.priority ?? "NORMAL",
      status: "INBOX",
      deadline: input.deadline ?? null,
      picId: input.picId ?? null,
      reviewerId: input.reviewerId ?? null,
      notaryId: input.notaryId ?? null,
      startDate: new Date()
    }
  });

  if (input.serviceTypeId) {
    const template = await prisma.serviceTemplate.findFirst({ where: { serviceTypeId: input.serviceTypeId } });

    if (template?.defaultChecklist) {
      const checklist = await prisma.jobChecklist.create({ data: { jobId: job.id, templateId: template.id } });
      const items = template.defaultChecklist as { label: string; isRequired?: boolean }[];
      if (Array.isArray(items) && items.length > 0) {
        await prisma.checklistItem.createMany({
          data: items.map((item) => ({ checklistId: checklist.id, label: item.label, isRequired: item.isRequired ?? true }))
        });
      }
    }

    if (template?.defaultTasks) {
      const tasks = template.defaultTasks as { title: string; description?: string }[];
      if (Array.isArray(tasks) && tasks.length > 0) {
        await prisma.jobTask.createMany({
          data: tasks.map((t) => ({ jobId: job.id, title: t.title, description: t.description ?? null }))
        });
      }
    }
  }

  await writeAuditLog({ userId: createdByUserId, action: "job_created", entityType: "Job", entityId: job.id, newValue: job });

  if (job.picId) {
    await createNotification({
      userId: job.picId,
      type: "assignment",
      message: `Anda ditugaskan sebagai PIC pada Job ${job.jobNumber}.`,
      relatedEntityType: "Job",
      relatedEntityId: job.id
    });
  }

  return job;
}
