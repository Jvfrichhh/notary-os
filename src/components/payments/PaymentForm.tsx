"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useMemo, useState } from "react";

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

interface ClientOption {
  id: string;
  fullName: string;
  clientNumber: string;
}
interface JobOption {
  id: string;
  jobNumber: string;
  clientId: string;
}

interface FormStateShape {
  errors?: Record<string, string[]>;
  formError?: string;
}

interface PaymentFormProps {
  action: (prevState: FormStateShape, formData: FormData) => Promise<FormStateShape>;
  clients: ClientOption[];
  jobs: JobOption[];
  lockedClient?: ClientOption;
  lockedJob?: JobOption;
  initial?: {
    totalAmount?: string;
    downPayment?: string;
    paidAmount?: string;
    status?: string;
    paymentDate?: string | null;
    paymentMethod?: string | null;
    notes?: string | null;
  };
  cancelHref: string;
}

const initialState: FormStateShape = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : label}
    </button>
  );
}

export function PaymentForm({ action, clients, jobs, lockedClient, lockedJob, initial, cancelHref }: PaymentFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};
  const [clientId, setClientId] = useState(lockedClient?.id ?? "");
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount ?? "0");
  const [paidAmount, setPaidAmount] = useState(initial?.paidAmount ?? "0");

  const filteredJobs = useMemo(() => jobs.filter((j) => !clientId || j.clientId === clientId), [jobs, clientId]);
  const remaining = Math.max(Number(totalAmount || 0) - Number(paidAmount || 0), 0);

  return (
    <form action={formAction} className="space-y-5">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Client <span className="text-status-overdue">*</span>
          </label>
          {lockedClient ? (
            <>
              <input type="hidden" name="clientId" value={lockedClient.id} />
              <input disabled value={`${lockedClient.clientNumber} — ${lockedClient.fullName}`} className={`${fieldClass} opacity-70`} />
            </>
          ) : (
            <select name="clientId" required value={clientId} onChange={(e) => setClientId(e.target.value)} className={fieldClass}>
              <option value="">— Pilih client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientNumber} — {c.fullName}
                </option>
              ))}
            </select>
          )}
          {errors.clientId?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.clientId[0]}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Job Terkait</label>
          {lockedJob ? (
            <>
              <input type="hidden" name="jobId" value={lockedJob.id} />
              <input disabled value={lockedJob.jobNumber} className={`${fieldClass} opacity-70`} />
            </>
          ) : (
            <select name="jobId" className={fieldClass} disabled={!clientId}>
              <option value="">— Tidak ada —</option>
              {filteredJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobNumber}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Total Tagihan (Rp)</label>
          <input
            type="number"
            min="0"
            step="1000"
            name="totalAmount"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Uang Muka / DP (Rp)</label>
          <input type="number" min="0" step="1000" name="downPayment" defaultValue={initial?.downPayment ?? "0"} className={fieldClass} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Sudah Dibayar (Rp)</label>
          <input
            type="number"
            min="0"
            step="1000"
            name="paidAmount"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Sisa Tagihan (Rp)</label>
          <input disabled value={remaining.toLocaleString("id-ID")} className={`${fieldClass} opacity-70`} />
          <p className="mt-1 text-xs text-muted-foreground">Dihitung otomatis: Total − Sudah Dibayar.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Status Pembayaran</label>
          <select name="status" defaultValue={initial?.status ?? "UNPAID"} className={fieldClass}>
            <option value="UNPAID">Belum Bayar</option>
            <option value="PARTIALLY_PAID">Bayar Sebagian</option>
            <option value="PAID">Lunas</option>
            <option value="REFUNDED">Refund</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Belum Bayar/Bayar Sebagian/Lunas otomatis mengikuti jumlah dibayar vs total. Pilih "Refund" hanya kalau
            dana memang dikembalikan ke client.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Tanggal Pembayaran</label>
          <input type="date" name="paymentDate" defaultValue={initial?.paymentDate ?? ""} className={fieldClass} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Metode Pembayaran</label>
          <input name="paymentMethod" defaultValue={initial?.paymentMethod ?? ""} placeholder="mis. Transfer BCA" className={fieldClass} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Catatan</label>
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className={fieldClass} />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={initial ? "Simpan Perubahan" : "Simpan Payment"} />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          Batal
        </Link>
      </div>
    </form>
  );
}
