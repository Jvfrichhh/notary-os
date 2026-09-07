import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { DeedForm } from "@/components/archive/DeedForm";
import { createDeed } from "@/app/(dashboard)/archive/actions";

interface NewDeedPageProps {
  searchParams: { jobId?: string; clientId?: string };
}

export default async function NewDeedPage({ searchParams }: NewDeedPageProps) {
  await requirePermission(PERMISSIONS.EDIT_MINUTA);

  const [clients, jobs, notaries, lockedJob] = await Promise.all([
    prisma.client.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, clientNumber: true }
    }),
    prisma.job.findMany({
      where: { recordStatus: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, jobNumber: true, description: true }
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { name: "NOTARY" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    searchParams.jobId
      ? prisma.job.findUnique({ where: { id: searchParams.jobId }, select: { id: true, jobNumber: true, clientId: true } })
      : Promise.resolve(null)
  ]);

  const lockedClientId = searchParams.clientId ?? lockedJob?.clientId;
  const lockedClient = lockedClientId ? clients.find((c) => c.id === lockedClientId) : undefined;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Akta Baru</h1>
        <p className="text-sm text-muted-foreground">Satu job boleh punya lebih dari satu akta.</p>
      </div>

      <Card>
        <DeedForm
          action={createDeed}
          clients={clients}
          jobs={jobs}
          notaries={notaries}
          lockedClient={lockedClient ? { id: lockedClient.id, label: `${lockedClient.clientNumber} — ${lockedClient.fullName}` } : undefined}
          lockedJob={lockedJob ? { id: lockedJob.id, label: lockedJob.jobNumber } : undefined}
          cancelHref={lockedJob ? `/jobs/${lockedJob.id}` : "/archive"}
        />
      </Card>
    </div>
  );
}
