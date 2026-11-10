import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { paymentBreakdown } from "@/lib/billing";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { formatCurrency, formatDate, formatDateTime, formatStatusLabel, toDateInput, getJakartaToday } from "@/lib/format";
import { cancelReceipt, recordPayment, refundPayment } from "@/app/(dashboard)/payments/actions";
import { unwrapProps, type Async } from "@/lib/pageProps";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const METHODS = ["Tunai", "Transfer bank", "QRIS", "Cek / Giro", "Potongan PPh (bukti potong)", "Lainnya"];

const OK: Record<string, string> = {
  created: "Tagihan dibuat.",
  updated: "Tagihan diperbarui.",
  receipt: "Pembayaran dicatat dan kuitansi dibuat.",
  voided: "Kuitansi dibatalkan; total dibayar sudah disesuaikan.",
  refunded: "Pengembalian dana dicatat; total dibayar sudah disesuaikan."
};
const ERR: Record<string, string> = {
  amount: "Isi jumlah pembayaran.",
  over: "Jumlah melebihi sisa tagihan. Ubah total tagihan dulu bila memang ada biaya tambahan.",
  reason: "Tulis alasan pembatalan kuitansi.",
  refundAmount: "Isi jumlah yang dikembalikan.",
  refundOver: "Jumlah pengembalian melebihi uang yang sudah diterima.",
  refundReason: "Tulis alasan pengembalian dana."
};

/** Tagihan satu pekerjaan: ringkasan, catat pembayaran, daftar kuitansi. */
export default async function PaymentDetailPage(props: Async<{ params: { id: string }; searchParams: { ok?: string; err?: string; r?: string } }>) {
  const { tp } = await getT();
  const { params, searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_FINANCE);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_FINANCE);
  const p = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, fullName: true, clientNumber: true } },
      job: { select: { id: true, jobNumber: true, description: true } },
      receipts: { orderBy: { createdAt: "desc" }, include: { receivedBy: { select: { name: true } } } }
    }
  });
  if (!p) notFound();
  const remaining = Number(p.remainingAmount);
  const total = Number(p.totalAmount);
  const rincian = paymentBreakdown(p);
  const refunds = await prisma.paymentRefund.findMany({ where: { paymentId: p.id }, orderBy: { refundedAt: "desc" } });
  const pct = total > 0 ? Math.min(100, Math.round((Number(p.paidAmount) / total) * 100)) : 0;
  const justCreated = searchParams.r ? p.receipts.find((r) => r.id === searchParams.r) : undefined;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/payments" className="text-xs text-muted-foreground hover:text-foreground">
            {tp("← Pembayaran")}
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{tp("Tagihan")} {p.invoiceNumber ?? ""}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clients/${p.client.id}`} className="text-primary hover:underline">
              {p.client.fullName}
            </Link>
            {p.job && (
              <>
                {" · "}
                <Link href={`/jobs/${p.job.id}`} className="text-primary hover:underline">
                  {p.job.jobNumber}
                </Link>
                {p.job.description ? ` · ${p.job.description}` : ""}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/billing/tagihan/${p.id}`} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
            {tp("Unduh Tagihan (Word)")}
          </a>
          {canEdit && (
            <Link href={`/payments/${p.id}/edit`} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
              {tp("Ubah total / catatan")}
            </Link>
          )}
        </div>
      </div>

      {searchParams.ok && OK[searchParams.ok] && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm">
          {OK[searchParams.ok]}
          {justCreated && (
            <>
              {" "}
              <a href={`/api/billing/kuitansi/${justCreated.id}`} className="font-medium text-primary hover:underline">
                {tp("Unduh kuitansi")} {justCreated.receiptNumber}
              </a>
            </>
          )}
        </div>
      )}
      {searchParams.err && ERR[searchParams.err] && (
        <div role="alert" className="rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2 text-sm">
          {ERR[searchParams.err]}
        </div>
      )}

      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={tp("Total tagihan")} value={formatCurrency(p.totalAmount)} />
          <Stat label={tp("Sudah dibayar")} value={formatCurrency(p.paidAmount)} />
          <Stat label={tp("Sisa")} value={formatCurrency(p.remainingAmount)} strong={remaining > 0} />
          <Stat label={tp("Status")} value={formatStatusLabel(p.status)} />
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-status-on-track" style={{ width: `${pct}%` }} />
        </div>
        {rincian.length > 0 && (
          <dl className="mt-4 divide-y divide-border border-t border-border text-sm">
            {rincian.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 py-2">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="font-medium text-foreground">{formatCurrency(r.amount)}</dd>
              </div>
            ))}
          </dl>
        )}
        {p.notes && <p className="mt-3 text-sm text-muted-foreground">{p.notes}</p>}
      </Card>

      {canEdit && remaining > 0 && p.status !== "REFUNDED" && (
        <Card>
          <h2 className="mb-3 text-base font-bold text-foreground">{tp("Catat pembayaran masuk")}</h2>
          <form action={recordPayment.bind(null, p.id)} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">{tp("Jumlah (Rp)")}</span>
              <input name="amount" inputMode="numeric" required defaultValue={String(remaining)} className={inputCls} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">{tp("Tanggal")}</span>
              <input type="date" name="paidAt" defaultValue={toDateInput(getJakartaToday())} className={inputCls} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">{tp("Cara bayar")}</span>
              <select name="method" defaultValue="Transfer bank" className={inputCls}>
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">{tp("Keterangan")}</span>
              <input name="note" maxLength={200} placeholder={tp("mis. DP / angsuran ke-2")} className={inputCls} />
            </label>
            <div className="sm:col-span-4">
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                {tp("Simpan & buat kuitansi")}
              </button>
              <span className="ml-2 text-xs text-muted-foreground">{tp("Jumlah terisi sisa tagihan; ubah bila klien membayar sebagian.")}</span>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-foreground">{tp("Kuitansi (")}{p.receipts.length})</h2>
        </div>
        {p.receipts.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">{tp("Belum ada pembayaran tercatat.")}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {p.receipts.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className={r.voidedAt ? "text-muted-foreground line-through" : "font-medium text-foreground"}>
                    {r.receiptNumber} · {formatCurrency(r.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.paidAt)} · {r.method ?? "-"} {tp("· diterima")} {r.receivedBy?.name ?? "-"}
                    {r.note ? ` · ${r.note}` : ""}
                    {r.voidedAt ? tp(" · DIBATALKAN {0}: {1}", [formatDateTime(r.voidedAt), r.voidReason ?? ""]) : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a href={`/api/billing/kuitansi/${r.id}`} className="text-xs font-medium text-primary hover:underline">
                    {tp("Unduh kuitansi")}
                  </a>
                  {canEdit && !r.voidedAt && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-status-overdue">{tp("Batalkan")}</summary>
                      <form action={cancelReceipt.bind(null, r.id)} className="mt-1 flex gap-1">
                        <input name="reason" required minLength={3} placeholder={tp("Alasan")} className="min-w-0 flex-1 rounded border border-border px-2 py-1" />
                        <ConfirmButton message={tp("Batalkan kuitansi ini? Total dibayar akan dikurangi.")} className="rounded border border-status-overdue/50 px-2 py-1 text-status-overdue">
                          {tp("OK")}
                        </ConfirmButton>
                      </form>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {(refunds.length > 0 || (canEdit && Number(p.paidAmount) > 0)) && (
        <Card className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-base font-bold text-foreground">{tp("Pengembalian Dana (")}{refunds.length})</h2>
          </div>
          {refunds.length > 0 && (
            <ul className="divide-y divide-border text-sm">
              {refunds.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {r.refundNumber} · {formatCurrency(r.amount)}
                    </p>
                    <p className="break-words text-xs text-muted-foreground">
                      {formatDate(r.refundedAt)} · {r.method ?? "-"} · {r.reason}
                    </p>
                  </div>
                  <a href={`/api/billing/pengembalian/${r.id}`} className="text-xs font-medium text-primary hover:underline">
                    {tp("Unduh bukti pengembalian")}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {canEdit && Number(p.paidAmount) > 0 && (
            <details className="border-t border-border px-5 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-foreground">{tp("Kembalikan dana ke klien")}</summary>
              <form action={refundPayment.bind(null, p.id)} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <label>
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Jumlah (Rp)")}</span>
                  <input name="amount" inputMode="numeric" required className={inputCls} />
                </label>
                <label>
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Tanggal")}</span>
                  <input type="date" name="refundedAt" defaultValue={toDateInput(getJakartaToday())} className={inputCls} />
                </label>
                <label>
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Cara")}</span>
                  <select name="method" defaultValue="Transfer bank" className={inputCls}>
                    {METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs text-muted-foreground">{tp("Alasan")}</span>
                  <input name="reason" required minLength={3} maxLength={300} placeholder={tp("mis. pekerjaan dibatalkan / kelebihan titipan pajak")} className={inputCls} />
                </label>
                <div className="sm:col-span-4">
                  <ConfirmButton
                    message={tp("Catat pengembalian dana ini? Total dibayar akan dikurangi dan catatannya tidak bisa dihapus.")}
                    className="rounded-md border border-status-overdue/50 px-4 py-2 text-sm font-medium text-status-overdue hover:bg-status-overdue/10"
                  >
                    {tp("Catat pengembalian")}
                  </ConfirmButton>
                  <span className="ml-2 text-xs text-muted-foreground">{tp("Paling banyak")} {formatCurrency(p.paidAmount)} {tp("(yang sudah diterima).")}</span>
                </div>
              </form>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base ${strong ? "font-semibold text-status-overdue" : "font-medium text-foreground"}`}>{value}</p>
    </div>
  );
}
