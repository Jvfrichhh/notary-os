import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { updatePayment } from "@/app/(dashboard)/payments/actions";

export default async function EditPaymentPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.EDIT_FINANCE);

  const payment = await prisma.payment.findUnique({ where: { id: params.id }, include: { client: true, job: true } });
  if (!payment) notFound();

  const action = updatePayment.bind(null, payment.id);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Edit Payment</h1>
      <Card>
        <PaymentForm
          action={action}
          clients={[]}
          jobs={[]}
          lockedClient={{ id: payment.client.id, fullName: payment.client.fullName, clientNumber: payment.client.clientNumber }}
          lockedJob={payment.job ? { id: payment.job.id, jobNumber: payment.job.jobNumber, clientId: payment.clientId } : undefined}
          initial={{
            totalAmount: payment.totalAmount.toString(),
            downPayment: payment.downPayment.toString(),
            paidAmount: payment.paidAmount.toString(),
            status: payment.status,
            paymentDate: payment.paymentDate ? payment.paymentDate.toISOString().slice(0, 10) : "",
            paymentMethod: payment.paymentMethod,
            notes: payment.notes
          }}
          cancelHref="/payments"
        />
      </Card>
    </div>
  );
}
