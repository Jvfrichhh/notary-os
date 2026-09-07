"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";

const visitSchema = z.object({
  clientId: z.string().optional().or(z.literal("")),
  visitorName: z.string().min(2, "Nama minimal 2 karakter"),
  phone: z.string().optional().or(z.literal("")),
  origin: z.string().optional().or(z.literal("")),
  purpose: z.string().optional().or(z.literal("")),
  serviceCategory: z.string().optional().or(z.literal("")),
  staffId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal(""))
});

export type VisitFormState = {
  errors?: Partial<Record<keyof z.infer<typeof visitSchema>, string[]>>;
  formError?: string;
};

function toNullable(value: string | undefined) {
  return value && value.trim() !== "" ? value.trim() : null;
}

export async function createVisit(_prevState: VisitFormState, formData: FormData): Promise<VisitFormState> {
  const user = await requireUser();
  await assertPermission(user.id, PERMISSIONS.CREATE_VISITS);

  const parsed = visitSchema.safeParse({
    clientId: formData.get("clientId") || "",
    visitorName: formData.get("visitorName"),
    phone: formData.get("phone") || "",
    origin: formData.get("origin") || "",
    purpose: formData.get("purpose") || "",
    serviceCategory: formData.get("serviceCategory") || "",
    staffId: formData.get("staffId") || "",
    notes: formData.get("notes") || ""
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const clientId = toNullable(data.clientId);

  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return { formError: "Client yang dipilih tidak ditemukan." };
    }
  }

  const visit = await prisma.visit.create({
    data: {
      clientId,
      visitorName: data.visitorName,
      phone: toNullable(data.phone),
      origin: toNullable(data.origin),
      purpose: toNullable(data.purpose),
      serviceCategory: toNullable(data.serviceCategory),
      staffId: toNullable(data.staffId),
      notes: toNullable(data.notes)
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "visit_created",
    entityType: "Visit",
    entityId: visit.id,
    newValue: visit
  });

  revalidatePath("/visits");
  revalidatePath("/dashboard");
  redirect(`/visits/${visit.id}`);
}
