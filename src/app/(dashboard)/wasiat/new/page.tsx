import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { WasiatForm } from "@/components/wasiat/WasiatForm";
import { createWasiat } from "@/app/(dashboard)/wasiat/actions";

export default async function NewWasiatPage() {
  await requirePermission(PERMISSIONS.EDIT_WASIAT);

  const [clients, jobs, documents] = await Promise.all([
    prisma.client.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, clientNumber: true } }),
    prisma.job.findMany({ where: { recordStatus: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: { id: true, jobNumber: true, clientId: true }, take: 300 }),
    prisma.document.findMany({
      where: { status: "ACTIVE" },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, fileName: true, clientId: true },
      take: 300
    })
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Catat Wasiat</h1>
      <Card>
        <WasiatForm action={createWasiat} clients={clients} jobs={jobs} documents={documents} cancelHref="/wasiat" />
      </Card>
    </div>
  );
}
