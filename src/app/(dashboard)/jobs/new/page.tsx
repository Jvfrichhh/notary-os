import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { JobForm } from "@/components/jobs/JobForm";
import { createJob } from "@/app/(dashboard)/jobs/actions";

interface NewJobPageProps {
  searchParams: { clientId?: string; visitId?: string };
}

export default async function NewJobPage({ searchParams }: NewJobPageProps) {
  await requirePermission(PERMISSIONS.CREATE_JOBS);

  const [clients, serviceTypes, users] = await Promise.all([
    prisma.client.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, clientNumber: true }
    }),
    prisma.serviceType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: { select: { name: true } } }
    })
  ]);

  const userOptions = users.map((u) => ({ id: u.id, name: u.name, role: u.role.name }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Buat Job Baru</h1>
        <p className="text-sm text-muted-foreground">
          Checklist dan task akan otomatis dibuat kalau jenis layanan punya Service Template.
        </p>
      </div>

      <Card>
        <JobForm
          action={createJob}
          clients={clients}
          serviceTypes={serviceTypes}
          users={userOptions}
          cancelHref="/jobs"
          defaultClientId={searchParams.clientId}
          defaultVisitId={searchParams.visitId}
        />
      </Card>
    </div>
  );
}
