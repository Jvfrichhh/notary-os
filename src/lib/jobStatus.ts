import type { JobStatus } from "@prisma/client";

// Urutan kolom Kanban, sesuai Blueprint §6 Joblist.
export const JOB_STATUSES: JobStatus[] = [
  "INBOX",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "WAITING_FOR_DOCUMENT",
  "REVIEW",
  "READY_FOR_SIGNING",
  "COMPLETED",
  "CANCELLED"
];

export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  INBOX: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_CLIENT", "WAITING_FOR_DOCUMENT", "REVIEW", "CANCELLED"],
  WAITING_FOR_CLIENT: ["IN_PROGRESS", "CANCELLED"],
  WAITING_FOR_DOCUMENT: ["IN_PROGRESS", "CANCELLED"],
  REVIEW: ["IN_PROGRESS", "READY_FOR_SIGNING", "CANCELLED"],
  READY_FOR_SIGNING: ["COMPLETED", "IN_PROGRESS", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

export function getValidNextStatuses(status: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}
