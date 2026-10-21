"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { createJobWithTemplate } from "@/lib/jobCreation";
import { fromDateInput } from "@/lib/format";
import { createPortalAccountForNewClient } from "@/lib/portalAccounts";

const clientSchema = z.object({
  fullName: z.string().min(2, "Nama minimal 2 karakter"),
  clientType: z.enum(["Individu", "Perusahaan"]).optional(),
  nik: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  companyName: z.string().optional().or(z.literal("")),
  npwp: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal(""))
});

export type ClientFormState = {
  errors?: Partial<Record<keyof z.infer<typeof clientSchema> | "serviceTypeId", string[]>>;
  formError?: string;
  /** NIK sudah dipakai klien lain -> form menampilkan pilihan "tetap simpan". */
  duplicateNik?: boolean;
};

/** Validasi isian bagian "pekerjaan baru" (layanan wajib, izin create_jobs). */
async function checkNewJobInput(
  userId: string,
  formData: FormData
): Promise<{ service: { id: string; name: string } } | { error: ClientFormState }> {
  if (!(await userHasPermission(userId, PERMISSIONS.CREATE_JOBS))) {
    return { error: { formError: "Hanya Notaris yang dapat membuat pekerjaan." } };
  }
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "").trim();
  if (!serviceTypeId) return { error: { errors: { serviceTypeId: ["Pilih layanan yang diminta."] } } };
  const service = await prisma.serviceType.findFirst({ where: { id: serviceTypeId, isActive: true }, select: { id: true, name: true } });
  if (!service) return { error: { errors: { serviceTypeId: ["Layanan tidak ditemukan."] } } };
  return { service };
}

/** Buat job dari isian bagian "pekerjaan baru"; Notaris pembuat menjadi Notaris penanggung jawab. */
async function createJobFromForm(clientId: string, service: { id: string; name: string }, formData: FormData, userId: string) {
  const ptChanges = formData.getAll("ptChanges").map(String).filter(Boolean);
  const note = String(formData.get("jobDescription") ?? "").trim();
  const description = [note || service.name, ptChanges.length ? `Perubahan: ${ptChanges.join(", ")}` : ""].filter(Boolean).join(" — ");
  const deadlineRaw = String(formData.get("jobDeadline") ?? "").trim();
  const picId = String(formData.get("jobPicId") ?? "").trim();
  const priority = String(formData.get("jobPriority") ?? "NORMAL");
  return createJobWithTemplate(
    {
      clientId,
      serviceTypeId: service.id,
      description: description.slice(0, 500),
      deadline: fromDateInput(deadlineRaw),
      picId: picId || null,
      priority: (["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority) ? priority : "NORMAL") as "LOW" | "NORMAL" | "HIGH" | "URGENT",
      notaryId: userId
    },
    userId
  );
}

/** "+ Pekerjaan baru" dari halaman klien (klien lama datang lagi). */
export async function createJobForClient(clientId: string, _prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const user = await requireUser();
  const checked = await checkNewJobInput(user.id, formData);
  if ("error" in checked) return checked.error;
  const client = await prisma.client.findFirst({ where: { id: clientId, status: "ACTIVE" }, select: { id: true } });
  if (!client) return { formError: "Klien tidak ditemukan." };
  const job = await createJobFromForm(client.id, checked.service, formData, user.id);
  revalidatePath(`/clients/${client.id}`);
  revalidatePath("/jobs");
  revalidatePath("/deeds");
  revalidatePath("/dashboard");
  redirect(`/jobs/${job.id}?created=job`);
}

/**
 * CLI-0001, CLI-0002, ... = nomor TERBESAR yang ada + 1. (Sebelumnya memakai
 * klien yang terakhir dibuat; bila urutan createdAt tidak sama dengan urutan
 * nomor -- mis. data impor/seed -- nomor bisa bentrok.)
 */
async function generateClientNumber(offset = 0): Promise<string> {
  const rows = await prisma.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING("clientNumber" FROM '([0-9]+)$') AS INTEGER)) AS max FROM clients
  `;
  const next = Number(rows[0]?.max ?? 0) + 1 + offset;
  return `CLI-${String(next).padStart(4, "0")}`;
}

const isUniqueClientNumberError = (err: unknown) =>
  typeof err === "object" &&
  err !== null &&
  (err as { code?: string }).code === "P2002" &&
  JSON.stringify((err as { meta?: unknown }).meta ?? "").includes("clientNumber");

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value.trim() : null;
}

export async function createClient(_prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.CREATE_CLIENTS);

  const parsed = clientSchema.safeParse({
    fullName: formData.get("fullName"),
    clientType: formData.get("clientType") || undefined,
    nik: formData.get("nik") || "",
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    address: formData.get("address") || "",
    city: formData.get("city") || "",
    companyName: formData.get("companyName") || "",
    npwp: formData.get("npwp") || "",
    notes: formData.get("notes") || ""
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Bagian "Langsung buat job": divalidasi SEBELUM klien disimpan supaya
  // tidak ada klien tersimpan setengah jalan karena layanan belum dipilih.
  const withJob = formData.get("withJob") === "on";
  let service: { id: string; name: string } | null = null;
  if (withJob) {
    const checked = await checkNewJobInput(user.id, formData);
    if ("error" in checked) return checked.error;
    service = checked.service;
  }

  // Klien lama datang lagi: jangan buat data ganda, arahkan ke halaman kliennya.
  const nikInput = toNullable(parsed.data.nik ?? "");
  if (nikInput && formData.get("allowDuplicateNik") !== "on") {
    const existing = await prisma.client.findFirst({
      where: { nik: nikInput, status: "ACTIVE" },
      select: { fullName: true, clientNumber: true }
    });
    if (existing) {
      return {
        errors: {
          nik: [
            `NIK ini sudah terdaftar atas ${existing.fullName} (${existing.clientNumber}). Buka halaman klien tersebut lalu klik "+ Pekerjaan baru", atau centang "Tetap simpan sebagai klien baru".`
          ]
        },
        duplicateNik: true
      };
    }
  }

  const data = parsed.data;

  // Simpan dengan nomor berikutnya; bila bentrok (dua orang menyimpan
  // bersamaan), coba nomor sesudahnya sampai 5 kali.
  let client: Awaited<ReturnType<typeof prisma.client.create>> | null = null;
  for (let attempt = 0; attempt < 5 && !client; attempt++) {
    const clientNumber = await generateClientNumber(attempt);
    try {
      client = await prisma.client.create({
        data: {
          clientNumber,
          fullName: data.fullName,
          clientType: data.clientType ?? null,
          nik: toNullable(data.nik),
          phone: toNullable(data.phone),
          email: toNullable(data.email),
          address: toNullable(data.address),
          city: toNullable(data.city),
          companyName: toNullable(data.companyName),
          npwp: toNullable(data.npwp),
          notes: toNullable(data.notes),
          createdBy: user.id
        }
      });
    } catch (err) {
      if (!isUniqueClientNumberError(err)) throw err;
    }
  }
  if (!client) return { formError: "Gagal membuat nomor client. Coba simpan lagi." };

  await writeAuditLog({
    userId: user.id,
    action: "client_created",
    entityType: "Client",
    entityId: client.id,
    newValue: client
  });

  revalidatePath("/clients");

  if (withJob && service) {
    let jobId: string;
    try {
      jobId = (await createJobFromForm(client.id, service, formData, user.id)).id;
    } catch (err) {
      // Klien + job harus jadi bersama: bila job gagal, klien yang baru dibuat dibatalkan.
      console.error("[clients] gagal membuat job untuk klien baru", err);
      await prisma.client.delete({ where: { id: client.id } }).catch(() => undefined);
      return { formError: "Gagal membuat pekerjaan; klien belum disimpan. Coba simpan lagi." };
    }
    revalidatePath("/jobs");
    revalidatePath("/deeds");
    revalidatePath("/dashboard");
    const portal = await maybeCreatePortal(client, formData, user.id, `/jobs/${jobId}`);
    redirect(`/jobs/${jobId}?created=client${portal}`);
  }

  const portal = await maybeCreatePortal(client, formData, user.id, `/clients/${client.id}`);
  redirect(`/clients/${client.id}${portal ? `?${portal.slice(1)}` : ""}`);
}

/** Centang "Buatkan akses portal" di Tambah Klien -> akun portal langsung dibuat. */
async function maybeCreatePortal(
  client: { id: string; email: string | null; fullName: string },
  formData: FormData,
  userId: string,
  showOnPath: string
): Promise<string> {
  if (formData.get("withPortal") !== "on" || !client.email) return "";
  if (!(await userHasPermission(userId, PERMISSIONS.EDIT_CLIENTS))) return "";
  try {
    const res = await createPortalAccountForNewClient({ clientId: client.id, email: client.email, name: client.fullName, userId, showOnPath });
    return res.ok ? "&portal=created" : "&portal=taken";
  } catch (err) {
    console.error("[clients] gagal membuat akses portal", err);
    return "&portal=failed";
  }
}

export async function updateClient(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_CLIENTS);

  const parsed = clientSchema.safeParse({
    fullName: formData.get("fullName"),
    clientType: formData.get("clientType") || undefined,
    nik: formData.get("nik") || "",
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    address: formData.get("address") || "",
    city: formData.get("city") || "",
    companyName: formData.get("companyName") || "",
    npwp: formData.get("npwp") || "",
    notes: formData.get("notes") || ""
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const before = await prisma.client.findUnique({ where: { id: clientId } });
  if (!before) {
    return { formError: "Client tidak ditemukan." };
  }

  const data = parsed.data;
  const client = await prisma.client.update({
    where: { id: clientId },
    data: {
      fullName: data.fullName,
      clientType: data.clientType ?? null,
      nik: toNullable(data.nik),
      phone: toNullable(data.phone),
      email: toNullable(data.email),
      address: toNullable(data.address),
      city: toNullable(data.city),
      companyName: toNullable(data.companyName),
      npwp: toNullable(data.npwp),
      notes: toNullable(data.notes)
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "client_updated",
    entityType: "Client",
    entityId: client.id,
    previousValue: before,
    newValue: client
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

export async function archiveClient(clientId: string) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.DELETE_CLIENTS);

  const before = await prisma.client.findUnique({ where: { id: clientId } });
  if (!before) return;

  const client = await prisma.client.update({
    where: { id: clientId },
    data: { status: "ARCHIVED" }
  });

  await writeAuditLog({
    userId: user.id,
    action: "client_archived",
    entityType: "Client",
    entityId: client.id,
    previousValue: { status: before.status },
    newValue: { status: client.status }
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function restoreClient(clientId: string) {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.EDIT_CLIENTS);

  const before = await prisma.client.findUnique({ where: { id: clientId } });
  if (!before) return;

  const client = await prisma.client.update({
    where: { id: clientId },
    data: { status: "ACTIVE" }
  });

  await writeAuditLog({
    userId: user.id,
    action: "client_restored",
    entityType: "Client",
    entityId: client.id,
    previousValue: { status: before.status },
    newValue: { status: client.status }
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}
