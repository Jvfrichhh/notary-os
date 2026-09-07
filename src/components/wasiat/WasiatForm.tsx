"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useMemo, useState } from "react";

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

const STATUS_OPTIONS = [
  { value: "DIBUAT", label: "Dibuat" },
  { value: "DICATAT", label: "Dicatat" },
  { value: "DILAPORKAN", label: "Dilaporkan" },
  { value: "BUKTI_TERSEDIA", label: "Bukti Tersedia" }
];

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
interface DocumentOption {
  id: string;
  fileName: string;
  clientId: string | null;
}

interface FormStateShape {
  errors?: Record<string, string[]>;
  formError?: string;
}

interface WasiatFormProps {
  action: (prevState: FormStateShape, formData: FormData) => Promise<FormStateShape>;
  clients: ClientOption[];
  jobs: JobOption[];
  documents: DocumentOption[];
  lockedClient?: ClientOption;
  initial?: {
    deedNumber?: string | null;
    date?: string | null; // yyyy-mm-dd
    wasiatType?: string | null;
    repertoriumId?: string | null;
    status?: string;
    evidenceDocumentId?: string | null;
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

export function WasiatForm({ action, clients, jobs, documents, lockedClient, initial, cancelHref }: WasiatFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};
  const [clientId, setClientId] = useState(lockedClient?.id ?? "");

  const filteredJobs = useMemo(() => jobs.filter((j) => !clientId || j.clientId === clientId), [jobs, clientId]);
  const filteredDocuments = useMemo(
    () => documents.filter((d) => !clientId || !d.clientId || d.clientId === clientId),
    [documents, clientId]
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-md border border-status-due-soon/30 bg-status-due-soon/10 px-3 py-2 text-xs text-foreground">
        Modul ini hanya pencatatan internal kantor. Bukan pengganti sistem pelaporan resmi ke AHU maupun kewajiban
        hukum notaris terkait wasiat.
      </div>

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
        </div>

        {!lockedClient && (
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Job Terkait</label>
            <select name="jobId" className={fieldClass} disabled={!clientId}>
              <option value="">— Tidak ada —</option>
              {filteredJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobNumber}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Nomor Akta</label>
          <input name="deedNumber" defaultValue={initial?.deedNumber ?? ""} className={fieldClass} />
          {errors.deedNumber?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.deedNumber[0]}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Tanggal</label>
          <input type="date" name="date" defaultValue={initial?.date ?? ""} className={fieldClass} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Jenis Wasiat</label>
          <input name="wasiatType" defaultValue={initial?.wasiatType ?? ""} placeholder="mis. Wasiat Umum" className={fieldClass} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Referensi Repertorium</label>
          <input
            name="repertoriumId"
            defaultValue={initial?.repertoriumId ?? ""}
            placeholder="mis. nomor urut repertorium (opsional)"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
          <select name="status" defaultValue={initial?.status ?? "DIBUAT"} className={fieldClass}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Dokumen Bukti</label>
          <select name="evidenceDocumentId" defaultValue={initial?.evidenceDocumentId ?? ""} className={fieldClass}>
            <option value="">— Tidak ada —</option>
            {filteredDocuments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fileName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuma dokumen yang sudah ada di Document Vault.{" "}
            <Link href={clientId ? `/documents/new?clientId=${clientId}` : "/documents/new"} className="text-primary hover:underline">
              Upload dulu
            </Link>{" "}
            kalau belum ada.
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Catatan</label>
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className={fieldClass} />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={initial ? "Simpan Perubahan" : "Simpan Wasiat"} />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          Batal
        </Link>
      </div>
    </form>
  );
}
