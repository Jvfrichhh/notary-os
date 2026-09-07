import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatCurrency, formatStatusLabel } from "@/lib/format";
import { archivePayment, restorePayment } from "@/app/(dashboard)/payments/actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { q?: string; status?: string; recordStatus?: string };
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const user = await requirePermission(PERMISSIONS.VIEW_FINANCE);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_FINANCE);

  const q = searchParams.q?.trim() ?? "";
  const recordStatus = searchParams.recordStatus === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";

  const payments = await prisma.payment.findMany({
    where: {
      recordStatus,
      ...(searchParams.status ? { status: searchParams.status as "UNPAID" | "PARTIALLY_PAID" | "PAID" | "REFUNDED" } : {}),
      ...(q
        ? {
            OR: [
              { client: { fullName: { contains: q, mode: "insensitive" } } },
              { paymentMethod: { contains: q, mode: "insensitive" } },
              { job: { jobNumber: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: { client: true, job: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground">Pencatatan tagihan dan pembayaran klien.</p>
        </div>
        {canEdit && (
          <Link href="/payments/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            + Catat Payment
          </Link>
        )}
      </div>

      <Card className="!p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="flex w-full flex-wrap gap-2 sm:max-w-xl">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari client, nomor job, metode..."
              className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="">Semua Status</option>
              <option value="UNPAID">Belum Bayar</option>
              <option value="PARTIALLY_PAID">Bayar Sebagian</option>
              <option value="PAID">Lunas</option>
              <option value="REFUNDED">Refund</option>
            </select>
            {recordStatus === "ARCHIVED" && <input type="hidden" name="recordStatus" value="ARCHIVED" />}
          </form>

          <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
            <Link
              href={`/payments${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-3 py-1 ${recordStatus === "ACTIVE" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Aktif
            </Link>
            <Link
              href={`/payments?recordStatus=ARCHIVED${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-3 py-1 ${recordStatus === "ARCHIVED" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Arsip
            </Link>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Belum ada record payment." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Dibayar</th>
                  <th className="px-4 py-3 font-medium">Sisa</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${p.client.id}`} className="font-medium text-foreground hover:underline">
                        {p.client.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.job ? (
                        <Link href={`/jobs/${p.job.id}`} className="hover:underline">
                          {p.job.jobNumber}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">{formatCurrency(p.totalAmount)}</td>
                    <td className="px-4 py-3 text-foreground">{formatCurrency(p.paidAmount)}</td>
                    <td className="px-4 py-3 text-foreground">{formatCurrency(p.remainingAmount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                        {formatStatusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-3 text-xs">
                          <Link href={`/payments/${p.id}/edit`} className="font-medium text-primary hover:underline">
                            Edit
                          </Link>
                          {recordStatus === "ACTIVE" ? (
                            <form action={archivePayment.bind(null, p.id)}>
                              <button type="submit" className="font-medium text-status-overdue hover:underline">
                                Arsipkan
                              </button>
                            </form>
                          ) : (
                            <form action={restorePayment.bind(null, p.id)}>
                              <button type="submit" className="font-medium text-foreground hover:underline">
                                Pulihkan
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
