"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePhrase } from "@/components/i18n/LocaleProvider";

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
    feeAmount?: string;
    taxDepositAmount?: string;
    agencyFeeAmount?: string;
    otherAmount?: string;
    ppnAmount?: string;
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
  const tp = usePhrase();
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};
  const [clientId, setClientId] = useState(lockedClient?.id ?? "");
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount ?? "0");
  const [paidAmount, setPaidAmount] = useState(initial?.paidAmount ?? "0");

  const [rincian, setRincian] = useState<Record<string, string>>({
    feeAmount: initial?.feeAmount ?? "",
    taxDepositAmount: initial?.taxDepositAmount ?? "",
    agencyFeeAmount: initial?.agencyFeeAmount ?? "",
    otherAmount: initial?.otherAmount ?? "",
    ppnAmount: initial?.ppnAmount ?? ""
  });
  const jumlahRincian = Object.values(rincian).reduce((n, v) => n + (Number(v) || 0), 0);
  const pakaiRincian = jumlahRincian > 0;
  const total = pakaiRincian ? jumlahRincian : Number(totalAmount || 0);

  const filteredJobs = useMemo(() => jobs.filter((j) => !clientId || j.clientId === clientId), [jobs, clientId]);
  const remaining = Math.max(total - Number(paidAmount || 0), 0);

  return (
    <form action={formAction} className="space-y-5">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {tp("Klien")} <span className="text-status-overdue">*</span>
          </label>
          {lockedClient ? (
            <>
              <input type="hidden" name="clientId" value={lockedClient.id} />
              <input disabled value={`${lockedClient.clientNumber} — ${lockedClient.fullName}`} className={`${fieldClass} opacity-70`} />
            </>
          ) : (
            <select name="clientId" required value={clientId} onChange={(e) => setClientId(e.target.value)} className={fieldClass}>
              <option value="">{tp("— Pilih klien —")}</option>
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
          <label className="mb-1 block text-sm font-medium text-foreground">{tp("Pekerjaan Terkait")}</label>
          {lockedJob ? (
            <>
              <input type="hidden" name="jobId" value={lockedJob.id} />
              <input disabled value={lockedJob.jobNumber} className={`${fieldClass} opacity-70`} />
            </>
          ) : (
            <select name="jobId" className={fieldClass} disabled={!clientId}>
              <option value="">{tp("— Tidak ada —")}</option>
              {filteredJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobNumber}
                </option>
              ))}
            </select>
          )}
        </div>

        <fieldset className="space-y-3 rounded-md border border-border p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-medium text-foreground">{tp("Rincian tagihan (opsional)")}</legend>
          <p className="text-xs text-muted-foreground">
            {tp("Pisahkan honorarium dari uang titipan klien. Bila rincian diisi, total tagihan dihitung otomatis dan rinciannya tercetak di tagihan.")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ["feeAmount", "Honorarium / jasa (Rp)"],
              ["taxDepositAmount", "Pajak titipan: BPHTB, PPh (Rp)"],
              ["agencyFeeAmount", "Biaya instansi: PNBP BPN/AHU (Rp)"],
              ["otherAmount", "Biaya lain: meterai, saksi (Rp)"],
              ["ppnAmount", "PPN atas honorarium (hanya bila kantor PKP; Rp)"]
            ].map(([key, label]) => (
              <label key={key}>
                <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  name={key}
                  value={rincian[key]}
                  onChange={(e) => setRincian((r) => ({ ...r, [key]: e.target.value }))}
                  className={fieldClass}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{tp("Total Tagihan (Rp)")}</label>
          <input
            type="number"
            min="0"
            step="1000"
            name="totalAmount"
            value={pakaiRincian ? String(jumlahRincian) : totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            readOnly={pakaiRincian}
            className={pakaiRincian ? `${fieldClass} opacity-70` : fieldClass}
          />
          {pakaiRincian && <p className="mt-1 text-xs text-muted-foreground">{tp("Dihitung dari rincian di atas.")}</p>}
          {errors.totalAmount?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.totalAmount[0]}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{tp("Uang Muka / DP (Rp)")}</label>
          <input type="number" min="0" step="1000" name="downPayment" defaultValue={initial?.downPayment ?? "0"} className={fieldClass} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{tp("Sudah Dibayar (Rp)")}</label>
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
          <label className="mb-1 block text-sm font-medium text-foreground">{tp("Sisa Tagihan (Rp)")}</label>
          <input disabled value={remaining.toLocaleString("id-ID")} className={`${fieldClass} opacity-70`} />
          <p className="mt-1 text-xs text-muted-foreground">{tp("Dihitung otomatis: Total − Sudah Dibayar.")}</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{tp("Status Pembayaran")}</label>
          <select name="status" defaultValue={initial?.status ?? "UNPAID"} className={fieldClass}>
            <option value="UNPAID">{tp("Belum Bayar")}</option>
            <option value="PARTIALLY_PAID">{tp("Bayar Sebagian")}</option>
            <option value="PAID">{tp("Lunas")}</option>
            <option value="REFUNDED">{tp("Refund")}</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            {tp("Belum Bayar/Bayar Sebagian/Lunas otomatis mengikuti jumlah dibayar vs total. Pilih \"Refund\" hanya kalau dana memang dikembalikan ke client.")}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{tp("Tanggal Pembayaran")}</label>
          <input type="date" name="paymentDate" defaultValue={initial?.paymentDate ?? ""} className={fieldClass} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{tp("Metode Pembayaran")}</label>
          <input name="paymentMethod" defaultValue={initial?.paymentMethod ?? ""} placeholder={tp("mis. Transfer BCA")} className={fieldClass} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">{tp("Catatan")}</label>
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className={fieldClass} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={initial ? tp("Simpan Perubahan") : tp("Simpan Payment")} />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          {tp("Batal")}
        </Link>
      </div>
    </form>
  );
}
