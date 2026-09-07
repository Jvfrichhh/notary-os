"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";

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
  errors?: Partial<Record<keyof z.infer<typeof clientSchema>, string[]>>;
  formError?: string;
};

async function generateClientNumber(): Promise<string> {
  const last = await prisma.client.findFirst({
    orderBy: { createdAt: "desc" },
    select: { clientNumber: true }
  });

  const lastSeq = last?.clientNumber?.match(/(\d+)$/)?.[1];
  const next = lastSeq ? parseInt(lastSeq, 10) + 1 : 1;
  return `CLI-${String(next).padStart(4, "0")}`;
}

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

  const clientNumber = await generateClientNumber();
  const data = parsed.data;

  const client = await prisma.client.create({
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

  await writeAuditLog({
    userId: user.id,
    action: "client_created",
    entityType: "Client",
    entityId: client.id,
    newValue: client
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
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
