import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { createPayment } from "@/app/(dashboard)/payments/actions";

interface PageProps {
  searchParams: { clientId?: string; jobId?: string };
}

export default async function NewPaymentPage({ searchParams }: PageProps) {
  await requirePermission(PERMISSIONS.EDIT_FINANCE);

  const [clients, jobs] = await Promise.all([
    prisma.client.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, clientNumber: true } }),
    prisma.job.findMany({ where: { recordStatus: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: { id: true, jobNumber: true, clientId: true }, take: 300 })
  ]);

  let lockedClient;
  let lockedJob;
  if (searchParams.jobId) {
    const job = await prisma.job.findUnique({ where: { id: searchParams.jobId }, include: { client: true } });
    if (job) {
      lockedJob = { id: job.id, jobNumber: job.jobNumber, clientId: job.clientId };
      lockedClient = { id: job.client.id, fullName: job.client.fullName, clientNumber: job.client.clientNumber };
    }
  } else if (searchParams.clientId) {
    const client = await prisma.client.findUnique({ where: { id: searchParams.clientId } });
    if (client) lockedClient = { id: client.id, fullName: client.fullName, clientNumber: client.clientNumber };
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Catat Payment</h1>
      <Card>
        <PaymentForm action={createPayment} clients={clients} jobs={jobs} lockedClient={lockedClient} lockedJob={lockedJob} cancelHref="/payments" />
      </Card>
    </div>
  );
}
