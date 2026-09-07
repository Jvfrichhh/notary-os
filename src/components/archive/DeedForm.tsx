"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { ArchiveFormState } from "@/app/(dashboard)/archive/actions";

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
  description: string | null;
}
interface UserOption {
  id: string;
  name: string;
}

interface DeedFormProps {
  action: (prevState: ArchiveFormState, formData: FormData) => Promise<ArchiveFormState>;
  clients: ClientOption[];
  jobs: JobOption[];
  notaries: UserOption[];
  lockedClient?: { id: string; label: string };
  lockedJob?: { id: string; label: string };
  cancelHref: string;
}

const initialState: ArchiveFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Akta"}
    </button>
  );
}

export function DeedForm({ action, clients, jobs, notaries, lockedClient, lockedJob, cancelHref }: DeedFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Nomor Akta <span className="text-status-overdue">*</span>
          </label>
          <input name="deedNumber" required className={fieldClass} placeholder="cth. 124/2026" />
          {errors.deedNumber?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.deedNumber[0]}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Tanggal Akta <span className="text-status-overdue">*</span>
          </label>
          <input type="date" name="deedDate" required className={fieldClass} />
          {errors.deedDate?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.deedDate[0]}</p> : null}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          Jenis Akta <span className="text-status-overdue">*</span>
        </label>
        <input name="deedType" required className={fieldClass} placeholder="cth. Akta Jual Beli" />
        {errors.deedType?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.deedType[0]}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Client <span className="text-status-overdue">*</span>
          </label>
          {lockedClient ? (
            <>
              <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{lockedClient.label}</p>
              <input type="hidden" name="clientId" value={lockedClient.id} />
            </>
          ) : (
            <select name="clientId" required defaultValue="" className={fieldClass}>
              <option value="" disabled>
                — Pilih client —
              </option>
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
              <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{lockedJob.label}</p>
              <input type="hidden" name="jobId" value={lockedJob.id} />
            </>
          ) : (
            <select name="jobId" defaultValue="" className={fieldClass}>
              <option value="">— Tidak terkait job —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobNumber} {j.description ? `— ${j.description}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Notaris</label>
        <select name="notaryId" defaultValue="" className={fieldClass}>
          <option value="">— Belum ditentukan —</option>
          {notaries.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          Batal
        </Link>
      </div>
    </form>
  );
}
