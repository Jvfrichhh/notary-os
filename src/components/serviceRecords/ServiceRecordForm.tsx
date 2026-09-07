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
interface UserOption {
  id: string;
  name: string;
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

interface ServiceRecordFormProps {
  action: (prevState: FormStateShape, formData: FormData) => Promise<FormStateShape>;
  moduleLabel: string; // "Legalisasi" | "Waarmerking"
  clients: ClientOption[];
  users: UserOption[];
  documents: DocumentOption[];
  lockedClient?: ClientOption; // edit mode: client tidak bisa diganti
  initial?: {
    number?: string;
    date?: string; // yyyy-mm-dd
    serviceType?: string | null;
    status?: string;
    picId?: string | null;
    documentId?: string | null;
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

export function ServiceRecordForm({
  action,
  moduleLabel,
  clients,
  users,
  documents,
  lockedClient,
  initial,
  cancelHref
}: ServiceRecordFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};
  const [clientId, setClientId] = useState(lockedClient?.id ?? "");

  const filteredDocuments = useMemo(
    () => documents.filter((d) => !clientId || !d.clientId || d.clientId === clientId),
    [documents, clientId]
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Nomor {moduleLabel} <span className="text-status-overdue">*</span>
          </label>
          <input name="number" defaultValue={initial?.number} required className={fieldClass} />
          {errors.number?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.number[0]}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Tanggal <span className="text-status-overdue">*</span>
          </label>
          <input type="date" name="date" defaultValue={initial?.date} required className={fieldClass} />
        </div>

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

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Jenis Layanan</label>
          <input name="serviceType" defaultValue={initial?.serviceType ?? ""} placeholder="mis. Legalisasi tanda tangan" className={fieldClass} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
          <select name="status" defaultValue={initial?.status ?? "PROCESS"} className={fieldClass}>
            <option value="DRAFT">Draft</option>
            <option value="PROCESS">Process</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">PIC</label>
          <select name="picId" defaultValue={initial?.picId ?? ""} className={fieldClass}>
            <option value="">— Belum ditentukan —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-foreground">Dokumen Terkait</label>
          <select name="documentId" defaultValue={initial?.documentId ?? ""} className={fieldClass}>
            <option value="">— Tidak ada —</option>
            {filteredDocuments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fileName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuma dokumen yang sudah ada di Document Vault. Belum ada file yang cocok?{" "}
            <Link href={clientId ? `/documents/new?clientId=${clientId}` : "/documents/new"} className="text-primary hover:underline">
              Upload dulu
            </Link>
            .
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Catatan</label>
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className={fieldClass} />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={initial ? "Simpan Perubahan" : `Simpan ${moduleLabel}`} />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          Batal
        </Link>
      </div>
    </form>
  );
}
