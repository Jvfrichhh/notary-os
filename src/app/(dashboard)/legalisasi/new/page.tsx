import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { ServiceRecordForm } from "@/components/serviceRecords/ServiceRecordForm";
import { createLegalisasi } from "@/app/(dashboard)/legalisasi/actions";
import { suggestRecordNumber, yearRange } from "@/lib/serviceRecordNumber";

export default async function NewLegalisasiPage() {
  await requirePermission(PERMISSIONS.EDIT_LEGALISASI);

  const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()) + "T00:00:00.000Z");
  const numbers = await prisma.legalisasi.findMany({ where: { date: yearRange(today) }, select: { number: true } });
  const suggestedNumber = suggestRecordNumber(numbers.map((n) => n.number), "L", today);

  const [clients, users, documents] = await Promise.all([
    prisma.client.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, clientNumber: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.document.findMany({
      where: { status: "ACTIVE" },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, fileName: true, clientId: true },
      take: 300
    })
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Catat Legalisasi</h1>
      </div>
      <Card>
        <ServiceRecordForm
          action={createLegalisasi}
          moduleLabel="Legalisasi"
          clients={clients}
          users={users}
          documents={documents}
          suggestedNumber={suggestedNumber}
          suggestedDate={today.toISOString().slice(0, 10)}
          cancelHref="/legalisasi"
        />
      </Card>
    </div>
  );
}
