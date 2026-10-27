import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissionKeys";
import type { ToolDefinition } from "@/lib/ai/client";
import type { JobStatus, Prisma } from "@prisma/client";
import { EXTRA_TOOLS } from "@/lib/ai/assistantToolsExtra";

/**
 * "Tools" untuk Asisten Kantor: kumpulan query Prisma BACA-SAJA yang sudah
 * ditentukan sebelumnya. Model hanya bisa memilih tool dan mengisi parameter;
 * ia tidak pernah menulis SQL dan tidak pernah mengubah data.
 *
 * Setiap tool punya `permission`. Tool yang user-nya tidak berhak TIDAK
 * dikirim ke model sama sekali, dan tetap ditolak di `runTool` bila model
 * mencoba memanggilnya -- dua lapis, sama seperti menu + requirePermission.
 */

export interface AssistantContext {
  userId: string;
  userName: string;
  permissions: ReadonlySet<string>;
}

export interface ToolSpec {
  def: ToolDefinition;
  permission: string;
  run: (input: Record<string, unknown>, ctx: AssistantContext) => Promise<unknown>;
}

const JOB_STATUSES: JobStatus[] = [
  "INBOX",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "WAITING_FOR_DOCUMENT",
  "REVIEW",
  "READY_FOR_SIGNING",
  "COMPLETED",
  "CANCELLED"
];
const OPEN_STATUSES: JobStatus[] = JOB_STATUSES.filter((s) => s !== "COMPLETED" && s !== "CANCELLED");

const LIMIT_MAX = 25;
const clampLimit = (v: unknown, dflt = 15) => Math.min(LIMIT_MAX, Math.max(1, Number(v) || dflt));
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const date = (v: unknown) => {
  const s = str(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

const jobSelect = {
  id: true,
  jobNumber: true,
  status: true,
  priority: true,
  deadline: true,
  description: true,
  createdAt: true,
  client: { select: { clientNumber: true, fullName: true } },
  serviceType: { select: { name: true } },
  pic: { select: { name: true } },
  checklists: { select: { items: { select: { status: true, reviewStatus: true } } } }
} as const;

function jobRow(j: {
  jobNumber: string;
  status: JobStatus;
  priority: string;
  deadline: Date | null;
  description: string | null;
  client: { clientNumber: string; fullName: string };
  serviceType: { name: string } | null;
  pic: { name: string } | null;
  checklists: { items: { status: string; reviewStatus: string | null }[] }[];
}) {
  const items = j.checklists.flatMap((c) => c.items);
  const complete = items.filter((i) => i.status === "COMPLETE").length;
  const pendingReview = items.filter((i) => i.reviewStatus === "PENDING_REVIEW").length;
  const today = startOfToday();
  return {
    jobNumber: j.jobNumber,
    client: `${j.client.fullName} (${j.client.clientNumber})`,
    service: j.serviceType?.name ?? null,
    status: j.status,
    priority: j.priority,
    deadline: iso(j.deadline),
    overdue: Boolean(j.deadline && j.deadline < today && OPEN_STATUSES.includes(j.status)),
    pic: j.pic?.name ?? null,
    checklist: `${complete}/${items.length}`,
    uploadsAwaitingReview: pendingReview,
    description: j.description
  };
}

const BASE_TOOLS: Record<string, ToolSpec> = {
  office_summary: {
    permission: PERMISSIONS.VIEW_JOBS,
    def: {
      name: "office_summary",
      description:
        "Ringkasan kondisi kantor saat ini: jumlah pekerjaan per status, yang lewat tenggat, jatuh tempo hari ini, unggahan klien yang menunggu pemeriksaan, kunjungan hari ini. Pakai untuk pertanyaan umum seperti 'bagaimana kondisi kantor' atau 'ada yang mendesak?'.",
      input_schema: { type: "object", properties: {} }
    },
    run: async (_input, ctx) => {
      const today = startOfToday();
      const tomorrow = addDays(today, 1);
      const [byStatus, overdue, dueToday, pendingReview, visitsToday] = await Promise.all([
        prisma.job.groupBy({ by: ["status"], where: { recordStatus: "ACTIVE" }, _count: { _all: true } }),
        prisma.job.count({ where: { recordStatus: "ACTIVE", status: { in: OPEN_STATUSES }, deadline: { lt: today } } }),
        prisma.job.count({ where: { recordStatus: "ACTIVE", status: { in: OPEN_STATUSES }, deadline: { gte: today, lt: tomorrow } } }),
        prisma.checklistItem.count({ where: { reviewStatus: "PENDING_REVIEW", checklist: { job: { recordStatus: "ACTIVE" } } } }),
        ctx.permissions.has(PERMISSIONS.VIEW_VISITS)
          ? prisma.visit.count({ where: { status: "ACTIVE", visitDate: { gte: today, lt: tomorrow } } })
          : Promise.resolve(null)
      ]);
      const out: Record<string, unknown> = {
        jobsByStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
        overdue,
        dueToday,
        clientUploadsAwaitingReview: pendingReview,
        visitsToday
      };
      if (ctx.permissions.has(PERMISSIONS.VIEW_FINANCE)) {
        const unpaid = await prisma.payment.aggregate({
          where: { recordStatus: "ACTIVE", status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
          _sum: { remainingAmount: true },
          _count: { _all: true }
        });
        out.outstandingPayments = { count: unpaid._count._all, totalRemaining: Number(unpaid._sum.remainingAmount ?? 0) };
      }
      return out;
    }
  },

  list_jobs: {
    permission: PERMISSIONS.VIEW_JOBS,
    def: {
      name: "list_jobs",
      description:
        "Daftar pekerjaan dengan filter. Default: hanya pekerjaan yang masih berjalan. Gunakan untuk 'job apa saja yang ...', 'pekerjaan si X', 'yang belum lengkap dokumennya'.",
      input_schema: {
        type: "object",
        properties: {
          statuses: { type: "array", items: { type: "string", enum: JOB_STATUSES }, description: "Batasi ke status tertentu." },
          includeClosed: { type: "boolean", description: "Sertakan COMPLETED/CANCELLED (default false)." },
          clientQuery: { type: "string", description: "Potongan nama atau nomor klien." },
          picName: { type: "string", description: "Nama PIC; 'saya' untuk user yang bertanya." },
          deadlineBefore: { type: "string", description: "YYYY-MM-DD; hanya tenggat sebelum/pada tanggal ini." },
          deadlineAfter: { type: "string", description: "YYYY-MM-DD." },
          overdueOnly: { type: "boolean" },
          checklistIncompleteOnly: { type: "boolean", description: "Hanya yang checklist dokumennya belum lengkap." },
          awaitingReviewOnly: { type: "boolean", description: "Hanya yang punya unggahan klien menunggu pemeriksaan." },
          limit: { type: "integer", minimum: 1, maximum: LIMIT_MAX }
        }
      }
    },
    run: async (input, ctx) => {
      const statuses = Array.isArray(input.statuses)
        ? (input.statuses.filter((s) => JOB_STATUSES.includes(s as JobStatus)) as JobStatus[])
        : undefined;
      const where: Prisma.JobWhereInput = { recordStatus: "ACTIVE" };
      if (statuses && statuses.length) where.status = { in: statuses };
      else if (!input.includeClosed) where.status = { in: OPEN_STATUSES };
      const cq = str(input.clientQuery);
      if (cq) where.client = { OR: [{ fullName: { contains: cq, mode: "insensitive" } }, { clientNumber: { contains: cq, mode: "insensitive" } }] };
      const pic = str(input.picName);
      if (pic) where.pic = pic.toLowerCase() === "saya" ? { id: ctx.userId } : { name: { contains: pic, mode: "insensitive" } };
      const before = date(input.deadlineBefore);
      const after = date(input.deadlineAfter);
      if (input.overdueOnly) where.deadline = { lt: startOfToday() };
      else if (before || after) where.deadline = { ...(after ? { gte: after } : {}), ...(before ? { lte: addDays(before, 1) } : {}) };
      if (input.awaitingReviewOnly) where.checklists = { some: { items: { some: { reviewStatus: "PENDING_REVIEW" } } } };
      if (input.checklistIncompleteOnly) where.checklists = { some: { items: { some: { status: "MISSING" } } } };

      const rows = await prisma.job.findMany({
        where,
        select: jobSelect,
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
        take: clampLimit(input.limit)
      });
      return { count: rows.length, jobs: rows.map(jobRow) };
    }
  },

  get_job: {
    permission: PERMISSIONS.VIEW_JOBS,
    def: {
      name: "get_job",
      description: "Detail satu pekerjaan berdasarkan nomor (mis. JOB-2026-0003): checklist per item dan status pemeriksaannya, tugas internal, dokumen, pembayaran (jika berhak).",
      input_schema: { type: "object", properties: { jobNumber: { type: "string" } }, required: ["jobNumber"] }
    },
    run: async (input, ctx) => {
      const jobNumber = str(input.jobNumber);
      if (!jobNumber) return { error: "jobNumber wajib diisi." };
      const j = await prisma.job.findFirst({
        where: { jobNumber: { equals: jobNumber, mode: "insensitive" }, recordStatus: "ACTIVE" },
        select: {
          ...jobSelect,
          notes: true,
          startDate: true,
          completionDate: true,
          reviewer: { select: { name: true } },
          notary: { select: { name: true } },
          checklists: { select: { items: { select: { label: true, status: true, isRequired: true, reviewStatus: true, reviewNote: true, attachedDocument: { select: { fileName: true, uploadedAt: true, uploadedByClientAccountId: true } } } } } },
          tasks: { select: { title: true, status: true, dueDate: true, assignee: { select: { name: true } } } },
          documents: { where: { status: "ACTIVE" }, select: { fileName: true, category: true, uploadedAt: true }, orderBy: { uploadedAt: "desc" }, take: 10 },
          payments: { where: { recordStatus: "ACTIVE" }, select: { totalAmount: true, paidAmount: true, remainingAmount: true, status: true, paymentDate: true } }
        }
      });
      if (!j) return { error: `Pekerjaan ${jobNumber} tidak ditemukan.` };
      return {
        ...jobRow(j as never),
        reviewer: j.reviewer?.name ?? null,
        notary: j.notary?.name ?? null,
        startDate: iso(j.startDate),
        completionDate: iso(j.completionDate),
        notes: j.notes,
        checklists: j.checklists.map((c) => ({
          items: c.items.map((i) => ({
            label: i.label,
            required: i.isRequired,
            status: i.status,
            review: i.reviewStatus,
            reviewNote: i.reviewNote,
            file: i.attachedDocument ? `${i.attachedDocument.fileName}${i.attachedDocument.uploadedByClientAccountId ? " (dari portal klien)" : ""}` : null
          }))
        })),
        tasks: j.tasks.map((t) => ({ title: t.title, status: t.status, due: iso(t.dueDate), assignee: t.assignee?.name ?? null })),
        documents: j.documents.map((d) => ({ fileName: d.fileName, category: d.category, uploadedAt: iso(d.uploadedAt) })),
        // Keuangan hanya dikembalikan bila user berhak melihatnya.
        payments: ctx.permissions.has(PERMISSIONS.VIEW_FINANCE)
          ? j.payments.map((p) => ({ total: Number(p.totalAmount), paid: Number(p.paidAmount), remaining: Number(p.remainingAmount), status: p.status, date: iso(p.paymentDate) }))
          : undefined
      };
    }
  },

  upcoming_deadlines: {
    permission: PERMISSIONS.VIEW_JOBS,
    def: {
      name: "upcoming_deadlines",
      description: "Pekerjaan berjalan yang jatuh tempo dalam N hari ke depan, plus yang sudah lewat tenggat.",
      input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 90, description: "Default 7." } } }
    },
    run: async (input) => {
      const days = Math.min(90, Math.max(1, Number(input.days) || 7));
      const today = startOfToday();
      const rows = await prisma.job.findMany({
        where: { recordStatus: "ACTIVE", status: { in: OPEN_STATUSES }, deadline: { lte: addDays(today, days) } },
        select: jobSelect,
        orderBy: { deadline: "asc" },
        take: LIMIT_MAX
      });
      const mapped = rows.map(jobRow);
      return { windowDays: days, overdue: mapped.filter((r) => r.overdue), upcoming: mapped.filter((r) => !r.overdue) };
    }
  },

  my_tasks: {
    permission: PERMISSIONS.VIEW_JOBS,
    def: {
      name: "my_tasks",
      description: "Tugas internal yang ditugaskan ke user yang bertanya dan belum selesai, beserta pekerjaannya.",
      input_schema: { type: "object", properties: {} }
    },
    run: async (_input, ctx) => {
      const rows = await prisma.jobTask.findMany({
        where: { assignedTo: ctx.userId, status: { not: "DONE" }, job: { recordStatus: "ACTIVE" } },
        select: { title: true, status: true, dueDate: true, job: { select: { jobNumber: true, client: { select: { fullName: true } } } } },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        take: LIMIT_MAX
      });
      return rows.map((t) => ({ title: t.title, status: t.status, due: iso(t.dueDate), job: t.job.jobNumber, client: t.job.client.fullName }));
    }
  },

  search_clients: {
    permission: PERMISSIONS.VIEW_CLIENTS,
    def: {
      name: "search_clients",
      description: "Cari klien berdasarkan nama, nomor klien, telepon, atau email. Mengembalikan data kontak, jumlah pekerjaan berjalan, dan apakah punya akses portal.",
      input_schema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: LIMIT_MAX } }, required: ["query"] }
    },
    run: async (input) => {
      const q = str(input.query);
      if (!q) return { error: "query wajib diisi." };
      const rows = await prisma.client.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { clientNumber: { contains: q, mode: "insensitive" } },
            { companyName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } }
          ]
        },
        select: {
          clientNumber: true,
          fullName: true,
          clientType: true,
          companyName: true,
          phone: true,
          email: true,
          city: true,
          _count: { select: { jobs: { where: { recordStatus: "ACTIVE", status: { in: OPEN_STATUSES } } }, accounts: { where: { isActive: true } } } }
        },
        take: clampLimit(input.limit, 10)
      });
      return rows.map((c) => ({
        clientNumber: c.clientNumber,
        name: c.fullName,
        type: c.clientType,
        company: c.companyName,
        phone: c.phone,
        email: c.email,
        city: c.city,
        openJobs: c._count.jobs,
        hasPortalAccess: c._count.accounts > 0
      }));
    }
  },

  payments_overview: {
    permission: PERMISSIONS.VIEW_FINANCE,
    def: {
      name: "payments_overview",
      description: "Pembayaran yang belum lunas (UNPAID / PARTIALLY_PAID) per pekerjaan dan klien, dengan sisa tagihan.",
      input_schema: { type: "object", properties: { clientQuery: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: LIMIT_MAX } } }
    },
    run: async (input) => {
      const cq = str(input.clientQuery);
      const rows = await prisma.payment.findMany({
        where: {
          recordStatus: "ACTIVE",
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
          ...(cq ? { client: { fullName: { contains: cq, mode: "insensitive" } } } : {})
        },
        select: { status: true, totalAmount: true, paidAmount: true, remainingAmount: true, paymentDate: true, client: { select: { fullName: true } }, job: { select: { jobNumber: true } } },
        orderBy: { remainingAmount: "desc" },
        take: clampLimit(input.limit)
      });
      const total = rows.reduce((s, p) => s + Number(p.remainingAmount), 0);
      return {
        totalRemaining: total,
        items: rows.map((p) => ({ client: p.client.fullName, job: p.job?.jobNumber ?? null, status: p.status, total: Number(p.totalAmount), paid: Number(p.paidAmount), remaining: Number(p.remainingAmount), lastPayment: iso(p.paymentDate) }))
      };
    }
  },

  recent_visits: {
    permission: PERMISSIONS.VIEW_VISITS,
    def: {
      name: "recent_visits",
      description: "Kunjungan klien/tamu ke kantor dalam N hari terakhir (default 7).",
      input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 90 } } }
    },
    run: async (input) => {
      const days = Math.min(90, Math.max(1, Number(input.days) || 7));
      const rows = await prisma.visit.findMany({
        where: { status: "ACTIVE", visitDate: { gte: addDays(startOfToday(), -days) } },
        select: { visitorName: true, purpose: true, serviceCategory: true, visitDate: true, client: { select: { clientNumber: true } }, staff: { select: { name: true } } },
        orderBy: { visitDate: "desc" },
        take: LIMIT_MAX
      });
      return rows.map((v) => ({ date: v.visitDate.toISOString(), visitor: v.visitorName, client: v.client?.clientNumber ?? null, purpose: v.purpose, service: v.serviceCategory, receivedBy: v.staff?.name ?? null }));
    }
  }
};

/** Semua tool: dasar + tambahan (assistantToolsExtra.ts). */
const TOOLS: Record<string, ToolSpec> = { ...BASE_TOOLS, ...EXTRA_TOOLS };

/** Definisi tool yang boleh dilihat model untuk user ini. */
export function toolsFor(ctx: AssistantContext): ToolDefinition[] {
  return Object.values(TOOLS)
    .filter((t) => ctx.permissions.has(t.permission))
    .map((t) => t.def);
}

/** Jalankan satu tool. Lapis kedua: tolak bila user tidak berhak, apa pun yang model minta. */
export async function runTool(name: string, input: Record<string, unknown>, ctx: AssistantContext): Promise<{ ok: boolean; result: unknown }> {
  const tool = TOOLS[name];
  if (!tool) return { ok: false, result: `Tool ${name} tidak dikenal.` };
  if (!ctx.permissions.has(tool.permission)) return { ok: false, result: "Anda tidak berhak mengakses data ini." };
  try {
    return { ok: true, result: await tool.run(input ?? {}, ctx) };
  } catch (err) {
    console.error(`[ai] tool ${name} gagal`, err);
    return { ok: false, result: "Gagal mengambil data." };
  }
}
